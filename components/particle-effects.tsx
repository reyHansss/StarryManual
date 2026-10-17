'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { assetUrl } from '@/lib/site-config';
import {
  createBackgroundScene,
  createPortraitScene,
  type ParticlePointer,
  type ParticleScene,
} from '@/lib/particles';

const SiteMotionContext = createContext({ enabled: true, toggle: () => {} });
const portraitSource = assetUrl('/images/home-portrait.png');

/** 共用开关随站点布局保留，切换文章或图谱时继续沿用用户的动效选择。 */
export function SiteMotion({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <SiteMotionContext.Provider value={{ enabled, toggle: () => setEnabled((value) => !value) }}>
      {children}
    </SiteMotionContext.Provider>
  );
}

export function useSiteMotion() {
  return useContext(SiteMotionContext);
}

function useParticleCanvas(kind: 'portrait' | 'background') {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enabled } = useSiteMotion();
  const enabledRef = useRef(enabled);
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    enabledRef.current = enabled;
    refresh.current();
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scope =
      kind === 'portrait' ? canvas.closest('.particle-portrait')! : document.documentElement;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer: ParticlePointer = { x: 0, y: 0, active: false, speed: 0 };
    let scene: ParticleScene | undefined;
    let disposed = false;
    let visible = false;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let pointerTime = 0;
    let touchTimer: ReturnType<typeof setTimeout> | undefined;
    const animated = () => enabledRef.current && !preference.matches;
    const allowed = () => visible && !document.hidden;

    function draw(now: number) {
      frame = 0;
      if (!scene || !allowed()) return;
      const milliseconds = previous ? now - previous : 1000 / 60;
      // 将装饰动画限制在 60 fps，后台恢复时重置时间基线，避免大步积分。
      if (previous && milliseconds < 1000 / 60 - 1) {
        frame = requestAnimationFrame(draw);
        return;
      }
      previous = now;
      const delta = Math.min(milliseconds / 1000, 1 / 30);
      elapsed += delta;
      pointer.speed *= Math.exp(-delta * 7);
      const moving = scene.draw(elapsed, delta, pointer, animated());
      canvas.dataset.motion = animated() ? (moving ? 'running' : 'idle') : 'paused';
      if (animated() && moving) frame = requestAnimationFrame(draw);
    }

    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (allowed() && scene) frame = requestAnimationFrame(draw);
      else canvas.dataset.motion = 'suspended';
    }
    refresh.current = sync;

    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      scene?.resize(width, height);
      sync();
    }

    function move(event: Event) {
      const input = event as PointerEvent;
      if (input.pointerType === 'touch' && input.type !== 'pointerdown') return;
      const rect = canvas.getBoundingClientRect();
      const x = input.clientX - rect.left;
      const y = input.clientY - rect.top;
      const now = performance.now();
      const seconds = Math.max((now - pointerTime) / 1000, 0.016);
      pointer.speed =
        input.pointerType === 'touch'
          ? 600
          : pointer.active
            ? Math.min(2400, Math.hypot(x - pointer.x, y - pointer.y) / seconds)
            : 0;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointerTime = now;
      // 背景静止后不占用 RAF，新的指针输入才唤醒。捕获阶段可接收图谱拖动中的输入。
      if (!frame && animated()) sync();
      // 触摸只在点按时短暂拨动，不阻止页面滚动，也不要求悬停或右键。
      if (input.pointerType === 'touch') {
        clearTimeout(touchTimer);
        touchTimer = setTimeout(leave, 240);
      }
    }

    function leave() {
      pointer.active = false;
      pointer.speed = 0;
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const sizeObserver = new ResizeObserver(resize);
    visibility.observe(canvas);
    sizeObserver.observe(canvas);
    scope.addEventListener('pointermove', move, { passive: true, capture: true });
    scope.addEventListener('pointerdown', move, { passive: true, capture: true });
    scope.addEventListener('pointerleave', leave);
    scope.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    const ready =
      kind === 'portrait'
        ? createPortraitScene(context, portraitSource)
        : Promise.resolve(createBackgroundScene(context));
    ready
      .then((created) => {
        if (disposed) return;
        scene = created;
        canvas.dataset.ready = 'true';
        resize();
      })
      .catch(() => {
        if (disposed) return;
        // 图片或画布不可用时保留原图；装饰失败不影响阅读、导航与静态导出。
        canvas.dataset.ready = 'false';
      });

    return () => {
      disposed = true;
      refresh.current = () => {};
      cancelAnimationFrame(frame);
      clearTimeout(touchTimer);
      visibility.disconnect();
      sizeObserver.disconnect();
      scope.removeEventListener('pointermove', move, true);
      scope.removeEventListener('pointerdown', move, true);
      scope.removeEventListener('pointerleave', leave);
      scope.removeEventListener('pointercancel', leave);
      window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
    };
  }, [kind]);

  return canvasRef;
}

export function SiteParticleBackground() {
  const canvas = useParticleCanvas('background');
  return <canvas ref={canvas} className="site-particle-background" aria-hidden="true" />;
}

export function ParticleMotionToggle() {
  const { enabled, toggle } = useSiteMotion();
  const label = enabled ? '暂停页面动效' : '开启页面动效';
  return (
    <button
      type="button"
      className="particle-motion-toggle"
      onClick={toggle}
      aria-pressed={!enabled}
      aria-label={label}
      title={label}
    >
      {enabled ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
    </button>
  );
}

export function ParticlePortrait() {
  const canvas = useParticleCanvas('portrait');
  return (
    <>
      <div className="particle-portrait">
        <img src={portraitSource} alt="白发角色插画，使用彩色粒子呈现" width={1024} height={1024} />
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      <div className="hero-particle-footer">
        <span>移动鼠标或轻触，拨动星屑</span>
      </div>
    </>
  );
}
