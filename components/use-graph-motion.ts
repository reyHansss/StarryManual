'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Node, NodeChange } from '@xyflow/react';
import { createGraphMotion } from '@/lib/graph-motion';
import type { GraphRelation } from '@/lib/graph';

/** 仅在手势及回稳期间更新位置；减少动态效果或页面隐藏时立即结束余动。 */
export function useGraphMotion<T extends Node>(
  initialNodes: T[],
  relations: GraphRelation[],
  layout: 'connections' | 'topics',
  compact: boolean,
  setNodes: Dispatch<SetStateAction<T[]>>,
) {
  const controller = useRef<{
    update: (changes: NodeChange<T>[]) => void;
  } | null>(null);

  useEffect(() => {
    if (compact) return;
    const motion = createGraphMotion(
      initialNodes.map((node) => ({ id: node.id, ...node.position })),
      relations,
      layout,
    );
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number | null = null;
    let previousTime = 0;
    let elapsed = 0;
    function animate(timestamp: number) {
      frame = null;
      if (!motion.isActive()) return;
      // 固定 60 Hz 物理步长，避免高刷新屏幕缩短余动；后台恢复不补算整段离开时间。
      elapsed += previousTime ? Math.min(timestamp - previousTime, 50) : 1000 / 60;
      previousTime = timestamp;
      let latest;
      while (elapsed >= 1000 / 60) {
        latest = motion.tick();
        elapsed -= 1000 / 60;
      }
      if (!latest) {
        frame = window.requestAnimationFrame(animate);
        return;
      }
      const positions = new Map(latest.map((point) => [point.id, point]));
      setNodes((nodes) =>
        nodes.map((node) => {
          // 被拖动节点由 React Flow 直接跟随指针，不能被物理帧覆盖而产生迟滞。
          if (node.dragging) return node;
          const position = positions.get(node.id)!;
          return { ...node, position: { x: position.x, y: position.y } };
        }),
      );
      if (motion.isActive()) frame = window.requestAnimationFrame(animate);
    }
    function updatePreference() {
      motion.setReducedMotion(preference.matches || document.hidden);
      if (!motion.isActive() && frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }
    updatePreference();
    preference.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updatePreference);
    controller.current = {
      update(changes) {
        for (const change of changes) {
          if (change.type !== 'position') continue;
          motion.update(change.id, change.position, change.dragging === true);
        }
        if (motion.isActive() && frame === null) {
          previousTime = 0;
          elapsed = 0;
          frame = window.requestAnimationFrame(animate);
        }
      },
    };
    return () => {
      controller.current = null;
      if (frame !== null) window.cancelAnimationFrame(frame);
      motion.stop();
      preference.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updatePreference);
    };
  }, [initialNodes, relations, layout, compact, setNodes]);

  return (changes: NodeChange<T>[]) => controller.current?.update(changes);
}
