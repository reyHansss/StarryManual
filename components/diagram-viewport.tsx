'use client';

import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Scan } from 'lucide-react';
import { diagramZoom, getDiagramViewport, type DiagramSize, type DiagramView } from '@/lib/diagram';
import '@xyflow/react/dist/style.css';

type DiagramNode = Node<{ title: string; svg: string }, 'diagram'>;

function DiagramArtwork({ data }: NodeProps<DiagramNode>) {
  return (
    <div
      className="diagram-artwork"
      role="img"
      aria-label={data.title}
      dangerouslySetInnerHTML={{ __html: data.svg }}
    />
  );
}

const nodeTypes = { diagram: DiagramArtwork };

function Viewport({
  title,
  svg,
  size,
  expanded,
  toggleExpanded,
  savedView,
  rememberView,
}: {
  title: string;
  svg: string;
  size: DiagramSize;
  expanded: boolean;
  toggleExpanded: () => void;
  savedView?: DiagramView | null;
  rememberView?: (view: DiagramView) => void;
}) {
  const helpId = useId();
  const { getViewport, setViewport, zoomIn, zoomOut, viewportInitialized } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const zoom = useStore((state) => state.transform[2]);
  const minimumZoom =
    width && height
      ? Math.min(diagramZoom.min, getDiagramViewport(size, { width, height }, true).zoom)
      : diagramZoom.min;
  const mode = useRef<'read' | 'fit' | 'manual'>(savedView ? 'manual' : expanded ? 'fit' : 'read');
  const initialView = useRef(savedView);
  const previousSize = useRef<DiagramSize | null>(null);
  const nodes = useMemo<DiagramNode[]>(
    () => [
      {
        id: 'artwork',
        type: 'diagram',
        position: { x: 0, y: 0 },
        data: { title, svg },
        width: size.width,
        height: size.height,
      },
    ],
    [title, svg, size],
  );

  useEffect(() => {
    if (!viewportInitialized || !width || !height) return;
    const previous = previousSize.current;
    if (!previous && initialView.current) {
      const saved = initialView.current;
      void setViewport({
        ...saved.viewport,
        x: saved.viewport.x + (width - saved.canvas.width) / 2,
        y: saved.viewport.y + (height - saved.canvas.height) / 2,
      });
    } else if (mode.current !== 'manual' || !previous) {
      void setViewport(getDiagramViewport(size, { width, height }, mode.current === 'fit'));
    } else {
      // 阅读者缩放后调整窗口，保留画布中心所看的位置，不重新缩小整张图。
      const current = getViewport();
      void setViewport({
        ...current,
        x: current.x + (width - previous.width) / 2,
        y: current.y + (height - previous.height) / 2,
      });
    }
    previousSize.current = { width, height };
  }, [viewportInitialized, width, height, size, getViewport, setViewport]);

  const frame = (fit: boolean) => {
    mode.current = fit ? 'fit' : 'read';
    void setViewport(getDiagramViewport(size, { width, height }, fit));
  };
  const changeZoom = (increase: boolean) => {
    mode.current = 'manual';
    void (increase ? zoomIn() : zoomOut());
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [48, 0],
      ArrowRight: [-48, 0],
      ArrowUp: [0, 48],
      ArrowDown: [0, -48],
    };
    if (event.key === '+' || event.key === '=') changeZoom(true);
    else if (event.key === '-') changeZoom(false);
    else if (event.key === '0' || event.key === 'Home') frame(false);
    else if (event.key.toLowerCase() === 'f') frame(true);
    else if (delta[event.key]) {
      mode.current = 'manual';
      const current = getViewport();
      void setViewport({
        ...current,
        x: current.x + delta[event.key][0],
        y: current.y + delta[event.key][1],
      });
    } else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="diagram-viewer not-prose">
      <div className="diagram-tools" role="group" aria-label="图表视图操作">
        <div className="diagram-zoom-tools">
          <button
            type="button"
            className="icon-button"
            onClick={() => changeZoom(false)}
            disabled={zoom <= minimumZoom}
            aria-label="缩小图表"
            title="缩小（−）"
          >
            <Minus size={17} />
          </button>
          <output className="diagram-zoom-value" aria-label="图表缩放比例">
            {zoom < 0.01 ? '<1' : Math.round(zoom * 100)}%
          </output>
          <button
            type="button"
            className="icon-button"
            onClick={() => changeZoom(true)}
            disabled={zoom >= diagramZoom.max}
            aria-label="放大图表"
            title="放大（+）"
          >
            <Plus size={17} />
          </button>
        </div>
        <div className="diagram-frame-tools">
          <button
            type="button"
            className="icon-button"
            onClick={() => frame(true)}
            aria-label="图表适应画布"
            title="适应画布（F）"
          >
            <Scan size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => frame(false)}
            aria-label="重置图表视图"
            title="恢复可读比例（0）"
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            data-diagram-expand
            onClick={toggleExpanded}
            aria-label={expanded ? '退出图表全屏' : '全屏查看图表'}
            title={expanded ? '退出全屏（Esc）' : '全屏查看'}
          >
            {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>
      <div
        className="diagram-canvas"
        role="region"
        aria-label={`${title}，可缩放图表`}
        aria-describedby={helpId}
        tabIndex={0}
        onKeyDown={handleKey}
        style={{ aspectRatio: `${size.width + 48} / ${size.height + 48}` }}
      >
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          disableKeyboardA11y
          deleteKeyCode={null}
          selectionKeyCode={null}
          panActivationKeyCode={null}
          zoomActivationKeyCode={null}
          panOnDrag={[0]}
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          preventScrolling
          minZoom={minimumZoom}
          maxZoom={diagramZoom.max}
          onMoveStart={(event) => {
            if (event) mode.current = 'manual';
          }}
          onMove={(_, viewport) => {
            if (width && height) rememberView?.({ viewport, canvas: { width, height } });
          }}
          proOptions={{ hideAttribution: true }}
        />
      </div>
      <div className="diagram-help" id={helpId}>
        <span>滚轮缩放 · 左键拖动 · 触屏单指平移、双指缩放</span>
        <span className="diagram-keyboard-help">
          聚焦画布后：+/− 缩放 · 方向键平移 · F 适应 · 0 重置
        </span>
      </div>
    </div>
  );
}

/** 与知识图谱复用现有的平移缩放能力；整张 SVG 作为一个只读画布，不改动图表节点和连线。 */
export function DiagramViewport(props: Parameters<typeof Viewport>[0]) {
  return (
    <ReactFlowProvider>
      <Viewport {...props} />
    </ReactFlowProvider>
  );
}
