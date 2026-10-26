'use client';

import { memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type NodeProps,
  type Node,
  type NodeChange,
  type Edge,
  type OnNodeDrag,
} from '@xyflow/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Maximize2,
  Search,
  Network,
  BookOpen,
  RotateCcw,
  X,
} from 'lucide-react';
import type { Article } from '@/lib/types';
import { articleModules, buildModuleNavigation } from '@/lib/navigation';
import { GRAPH_MIN_ZOOM, GRAPH_MAX_ZOOM, getGraphNodeMetrics } from '@/lib/graph-appearance';
import { useGraphMotion } from './use-graph-motion';
import { GraphSectionPicker } from './graph-scope-picker';
import { ModulePicker } from './module-picker';
import {
  getGraphPositions,
  getGraphRelations,
  getGraphArticles,
  getGraphSections,
  getModuleGraph,
  getLocalArticles,
  globalGraphView,
  readGraphView,
  type GraphRelation,
  type GraphView,
  type GraphItem,
} from '@/lib/graph';
import '@xyflow/react/dist/style.css';

type ArticleNode = Node<{
  article: GraphItem;
  focused: boolean;
  center: boolean;
  compact: boolean;
  degree: number;
  select: (slug?: string) => void;
}>;

function ArticlePoint({ data }: NodeProps<ArticleNode>) {
  const module = articleModules[data.article.module];
  const isModule = data.article.kind === 'module';
  const zoom = useStore((state) => state.transform[2]);
  const metrics = getGraphNodeMetrics(data.degree, zoom, isModule);
  // 远景只保留节点与连线；标签透明度与圆点补偿都不改变布局锚点。
  const labelOpacity = Math.max(0, Math.min(1, (zoom - 0.22) / 0.14));
  if (data.compact) {
    return (
      <div
        className={`atlas-node ${data.focused ? 'focused' : ''}`}
        style={
          {
            '--node-color': module.nodeColor,
            '--node-ink': module.color,
          } as React.CSSProperties
        }
      >
        <Handle type="target" position={Position.Left} isConnectable={false} />
        <div className="node-module">
          <i />
          {module.shortLabel}
        </div>
        <button
          className="node-title nodrag nopan"
          aria-label={`选择${data.article.title}`}
          aria-pressed={data.focused}
          onClick={() => data.select(data.article.slug)}
        >
          {data.article.title}
        </button>
        {data.article.url && (
          <Link
            href={data.article.url}
            className="node-open nodrag nopan"
            aria-label={`打开${data.article.title}`}
          >
            <ArrowRight size={13} />
          </Link>
        )}
        <Handle type="source" position={Position.Right} isConnectable={false} />
      </div>
    );
  }
  const labelSize = isModule ? 18 : 16;
  return (
    <div
      className={`atlas-dot-node ${data.center ? 'is-center' : ''}`}
      style={
        {
          '--node-color': module.nodeColor,
          '--node-ink': module.color,
          '--node-size': `${metrics.diameter}px`,
          '--node-visual-size': `${metrics.visualDiameter}px`,
          '--graph-point-scale': metrics.scale,
          '--graph-inverse-zoom': 1 / zoom,
          '--graph-label-size': `${labelSize}px`,
          // 当前查看或临时强调的标题至少保留 12 CSS 屏幕像素，整体补偿文字排版。
          '--graph-label-scale': Math.max(1, 12 / (labelSize * zoom)),
          '--graph-label-opacity': labelOpacity,
          '--graph-label-visibility': labelOpacity === 0 ? 'hidden' : 'visible',
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span className="node-point" aria-hidden="true" title={`${data.degree} 条连接`}>
        <i />
      </span>
      <div className="dot-content">
        <span className="dot-title">
          {data.article.title}
          {data.article.kind === 'module' && (
            <span className="graph-module-count">{data.article.articleCount} 篇文档</span>
          )}
        </span>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

const nodeTypes = { article: memo(ArticlePoint, (previous, next) => previous.data === next.data) };

/** 圆点与键盘聚焦共用节点身份；文字和透明容器不参与指针命中。 */
function graphNodeId(target: EventTarget | null) {
  return target instanceof Element
    ? (target.closest<HTMLElement>('.react-flow__node')?.dataset.id ?? null)
    : null;
}

function FitGraphView({ compact }: { compact: boolean }) {
  const { fitView } = useReactFlow();
  const initialized = useNodesInitialized();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  useEffect(() => {
    if (initialized && width && height) {
      void fitView({ padding: compact ? 0.25 : 0.18, maxZoom: 1.3 });
    }
  }, [fitView, initialized, width, height, compact]);
  return null;
}

function GraphCanvas({
  articles,
  relations,
  activeSlug,
  center,
  layout,
  compact,
  select,
}: {
  articles: GraphItem[];
  relations: GraphRelation[];
  activeSlug: string | undefined;
  center: string | null;
  layout: 'connections' | 'modules';
  compact: boolean;
  select: (slug?: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [keyboardId, setKeyboardId] = useState<string | null>(null);
  const selectedId = compact ? activeSlug : undefined;
  const emphasisId = compact ? selectedId : (draggedId ?? hoveredId ?? keyboardId);
  const neighborsById = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    for (const { source, target } of relations) {
      if (!neighbors.has(source)) neighbors.set(source, new Set());
      if (!neighbors.has(target)) neighbors.set(target, new Set());
      neighbors.get(source)!.add(target);
      neighbors.get(target)!.add(source);
    }
    return neighbors;
  }, [relations]);
  const [initialNodes] = useState(() => {
    const positions = getGraphPositions(articles, relations, layout, center);
    return articles.map((article, index): ArticleNode => {
      // 紧凑视图使用卡片预览；完整图使用关系布局与可拖动的圆点节点。
      const angle = (index / Math.max(articles.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      const previewPosition =
        index === 0
          ? { x: 340, y: 215 }
          : { x: 340 + Math.cos(angle) * 310, y: 215 + Math.sin(angle) * 205 };
      return {
        id: article.slug,
        type: 'article',
        position: compact ? previewPosition : positions.get(article.slug)!,
        ariaLabel: compact ? article.title : `查看${article.title}详情`,
        ariaRole: compact ? undefined : 'button',
        dragHandle: compact ? undefined : '.node-point',
        // 外层仍负责键盘操作与布局测量，指针仅由圆点重新开启命中。
        style: compact ? undefined : { pointerEvents: 'none' },
        data: {
          article,
          focused: false,
          center: article.slug === center,
          compact,
          degree: neighborsById.get(article.slug)?.size ?? 0,
          select,
        },
      };
    });
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<ArticleNode>(initialNodes);
  const updateMotion = useGraphMotion(initialNodes, relations, layout, compact, setNodes);
  // 临时强调只修改外层样式，位置帧继续复用标题数据、连线与手势回调。
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const focused = node.id === selectedId;
        const emphasisClass =
          compact || !emphasisId
            ? undefined
            : node.id === emphasisId
              ? 'graph-node-active'
              : neighborsById.get(emphasisId)?.has(node.id)
                ? 'graph-node-neighbor'
                : 'graph-node-muted';
        const readable = !compact && (node.id === emphasisId || node.id === activeSlug);
        const className = readable
          ? `${emphasisClass ?? ''} graph-label-readable`.trim()
          : emphasisClass;
        const data =
          node.data.focused === focused && node.data.select === select
            ? node.data
            : { ...node.data, focused, select };
        return node.className === className && node.data === data
          ? node
          : { ...node, className, data };
      }),
    );
  }, [selectedId, activeSlug, emphasisId, neighborsById, compact, select, setNodes]);
  const emphasisColor = useMemo(() => {
    const article = articles.find((item) => item.slug === emphasisId);
    return article ? articleModules[article.module].nodeColor : 'var(--graph-edge-active)';
  }, [articles, emphasisId]);
  const edges = useMemo<Edge[]>(
    () =>
      relations.map((relation) => {
        const highlighted = relation.source === emphasisId || relation.target === emphasisId;
        return {
          ...relation,
          type: compact ? 'default' : 'straight',
          selectable: false,
          focusable: false,
          style: {
            stroke: highlighted ? emphasisColor : 'var(--graph-edge)',
            strokeWidth: highlighted ? 1.25 : 1,
            opacity: highlighted ? 0.9 : emphasisId && !compact ? 0.07 : 0.35,
          },
        };
      }),
    [relations, emphasisId, emphasisColor, compact],
  );
  const handleNodesChange = useCallback(
    (changes: NodeChange<ArticleNode>[]) => {
      onNodesChange(changes);
      updateMotion(changes);
    },
    [onNodesChange, updateMotion],
  );
  const selectNode = useCallback((_: unknown, node: ArticleNode) => select(node.id), [select]);
  const clearEmphasis = useCallback(() => {
    setHoveredId(null);
    setDraggedId(null);
    setKeyboardId(null);
  }, []);
  useEffect(() => {
    if (compact) return;
    const hide = () => {
      if (document.hidden) clearEmphasis();
    };
    window.addEventListener('blur', clearEmphasis);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('blur', clearEmphasis);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [compact, clearEmphasis]);
  const pointerOver = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (compact || draggedId || event.pointerType === 'touch') return;
      const id = graphNodeId(event.target);
      if (id !== graphNodeId(event.relatedTarget)) setHoveredId(id);
    },
    [compact, draggedId],
  );
  const pointerOut = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (compact || draggedId || event.pointerType === 'touch') return;
      const id = graphNodeId(event.relatedTarget);
      if (id !== graphNodeId(event.target)) setHoveredId(id);
    },
    [compact, draggedId],
  );
  const startDrag = useCallback<OnNodeDrag<ArticleNode>>((_, node) => {
    setDraggedId(node.id);
    setHoveredId(null);
    setKeyboardId(null);
  }, []);
  const stopDrag = useCallback<OnNodeDrag<ArticleNode>>((event) => {
    setDraggedId(null);
    // 松手后按实际命中恢复悬停；拖出画布或触摸结束不会留下过期的拖动强调。
    setHoveredId(
      'clientX' in event
        ? graphNodeId(document.elementFromPoint(event.clientX, event.clientY))
        : null,
    );
  }, []);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: compact ? 0.25 : 0.18, maxZoom: 1.3 }}
      minZoom={GRAPH_MIN_ZOOM}
      maxZoom={GRAPH_MAX_ZOOM}
      nodesDraggable={!compact}
      nodesConnectable={false}
      onNodeClick={selectNode}
      onNodeDragStart={startDrag}
      onNodeDragStop={stopDrag}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      onPointerLeave={() => setHoveredId(null)}
      onPointerCancel={clearEmphasis}
      onPointerDownCapture={(event) => {
        setKeyboardId(null);
        if (event.pointerType === 'touch') setHoveredId(null);
      }}
      onFocusCapture={(event) => {
        if (!compact && event.target.matches(':focus-visible')) {
          setHoveredId(null);
          setKeyboardId(graphNodeId(event.target));
        }
      }}
      onBlurCapture={() => setKeyboardId(null)}
      onKeyDown={(event) => {
        if (
          !compact &&
          event.target instanceof Element &&
          event.target.matches('.react-flow__node') &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          select(graphNodeId(event.target) ?? undefined);
        }
      }}
      onPaneClick={() => {
        clearEmphasis();
        if (!compact) select();
      }}
      deleteKeyCode={null}
      nodeDragThreshold={5}
      panOnDrag={[0]}
      zoomOnDoubleClick={false}
      panOnScroll={false}
      zoomOnScroll={!compact}
      preventScrolling={!compact}
      aria-label="关系图谱"
    >
      <FitGraphView compact={compact} />
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="var(--graph-grid)" />
      {!compact && <Controls showInteractive={false} />}
    </ReactFlow>
  );
}

function GraphExplorer({
  articles,
  compact = false,
  view = globalGraphView,
  navigate,
}: {
  articles: Article[];
  compact?: boolean;
  view?: GraphView;
  navigate?: (view: GraphView, replace?: boolean) => void;
}) {
  const scopeKey = JSON.stringify([
    view.module,
    view.section,
    view.center,
    view.query,
    view.display,
  ]);
  const [selection, setSelection] = useState({
    scope: scopeKey,
    slug: compact ? 'architecture' : undefined,
  });
  const [layout, setLayout] = useState<'connections' | 'modules'>('connections');
  const [revision, setRevision] = useState(0);
  const moduleGraph = useMemo(() => getModuleGraph(articles, articleModules), [articles]);
  const modules = moduleGraph.map((item) => ({ key: item.module, count: item.articleCount }));
  const moduleOnly =
    !compact && view.module === 'all' && !view.center && view.display === 'modules';
  const visible: GraphItem[] = useMemo(() => {
    if (!moduleOnly) return getGraphArticles(articles, view);
    const query = view.query.trim().toLowerCase();
    return moduleGraph.filter((item) =>
      `${item.title} ${item.description} ${item.module}`.toLowerCase().includes(query),
    );
  }, [articles, scopeKey, moduleOnly, moduleGraph]);
  const sections = getGraphSections(articles, view.module);
  const moduleNavigation = useMemo(() => buildModuleNavigation(articles), [articles]);
  const relations = useMemo(() => getGraphRelations(visible), [visible]);
  // 内容更新时重建节点；选择变化不进入 key，保留读者刚刚拖动的位置。
  const canvasKey = JSON.stringify([
    scopeKey,
    layout,
    revision,
    visible.map((article) => [
      article.slug,
      article.title,
      article.module,
      article.links,
      article.kind === 'module' ? article.articleCount : null,
    ]),
  ]);
  const centerArticle = articles.find((article) => article.slug === view.center);
  const current =
    visible.find(
      (article) => article.slug === (selection.scope === scopeKey ? selection.slug : undefined),
    ) ?? (compact ? visible[0] : undefined);
  const neighbors: GraphItem[] = current
    ? (moduleOnly
        ? getLocalArticles(moduleGraph, current.slug)
        : getLocalArticles(articles, current.slug)
      ).filter((article) => article.slug !== current.slug)
    : [];
  const select = useCallback(
    (slug?: string) => {
      setSelection({ scope: scopeKey, slug });
    },
    [scopeKey],
  );
  const explore = useCallback(
    (slug: string) => {
      const module = moduleGraph.find((item) => item.slug === slug);
      if (module) {
        navigate?.({ ...view, module: module.module, section: [], center: null, query: '' });
        return;
      }
      navigate?.({ ...view, center: slug, query: '' });
    },
    [moduleGraph, navigate, view],
  );
  const parentView = { ...view, center: null, query: '' };
  const rootView = { ...globalGraphView, display: view.display };
  const scopeTitle = centerArticle
    ? `${centerArticle.title}的局部图`
    : (view.section.at(-1) ??
      (view.module !== 'all'
        ? articleModules[view.module].shortLabel
        : moduleOnly
          ? '主模块总览'
          : '全部文章'));
  return (
    <div className={`knowledge-graph ${compact ? 'compact' : ''}`}>
      {!compact && (
        <>
          <div className="graph-navigation">
            <nav className="graph-breadcrumbs" aria-label="图谱路径">
              <button
                onClick={() => navigate?.(rootView)}
                aria-current={!centerArticle && view.module === 'all' ? 'page' : undefined}
              >
                <Network size={15} /> 全局图
              </button>
              {view.module !== 'all' && (
                <>
                  <ChevronRight size={13} />
                  <button
                    onClick={() => navigate?.({ ...parentView, section: [] })}
                    aria-current={!centerArticle && !view.section.length ? 'page' : undefined}
                  >
                    {articleModules[view.module].shortLabel}
                  </button>
                </>
              )}
              {view.section.map((label, index) => (
                <span className="graph-section-crumb" key={index}>
                  <ChevronRight size={13} />
                  <button
                    onClick={() =>
                      navigate?.({ ...parentView, section: view.section.slice(0, index + 1) })
                    }
                    aria-current={
                      !centerArticle && index === view.section.length - 1 ? 'page' : undefined
                    }
                  >
                    {label}
                  </button>
                </span>
              ))}
              {centerArticle && (
                <>
                  <ChevronRight size={13} />
                  <span aria-current="page">{centerArticle.title}的局部图</span>
                </>
              )}
            </nav>
            {(centerArticle || view.module !== 'all') && (
              <button
                className="graph-up"
                onClick={() =>
                  navigate?.(
                    centerArticle
                      ? parentView
                      : view.section.length
                        ? { ...parentView, section: view.section.slice(0, -1) }
                        : rootView,
                  )
                }
              >
                <ArrowLeft size={14} />
                {view.section.length
                  ? centerArticle
                    ? '返回功能图'
                    : '返回上一级'
                  : centerArticle && view.module !== 'all'
                    ? '返回模块图'
                    : '返回全局图'}
              </button>
            )}
          </div>
          <div className="graph-toolbar">
            <div className="graph-scope-controls">
              <ModulePicker
                includeAll
                modules={modules}
                current={view.module}
                onChange={(module) =>
                  navigate?.({ ...view, module, section: [], center: null, query: '' })
                }
              />
              {!view.center && sections.length > 0 && (
                <GraphSectionPicker
                  entries={moduleNavigation.find((module) => module.key === view.module)!.entries}
                  current={view.section}
                  onChange={(section) => navigate?.({ ...view, section, query: '' })}
                />
              )}
              {view.module === 'all' && !view.center && (
                <div className="graph-display-toggle" role="group" aria-label="全局图显示范围">
                  <button
                    aria-pressed={view.display === 'modules'}
                    onClick={() => navigate?.({ ...view, display: 'modules', query: '' })}
                  >
                    主模块
                  </button>
                  <button
                    aria-pressed={view.display === 'articles'}
                    onClick={() => navigate?.({ ...view, display: 'articles', query: '' })}
                  >
                    全部文章
                  </button>
                </div>
              )}
            </div>
            <label className="graph-search">
              <Search size={15} />
              <input
                aria-label="筛选图谱节点"
                placeholder="在当前图中查找"
                value={view.query}
                onChange={(event) => navigate?.({ ...view, query: event.target.value }, true)}
              />
              {view.query && (
                <button
                  aria-label="清空图谱搜索"
                  onClick={() => navigate?.({ ...view, query: '' }, true)}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </>
      )}
      <div className="graph-body">
        <div className="graph-canvas">
          <div className="graph-caption" role="status" aria-live="polite">
            <i className="status-dot" />
            {compact
              ? '文档之间的真实关联'
              : moduleOnly
                ? `${visible.length} 个模块 · ${relations.length} 组跨模块阅读关联`
                : `${visible.length} 个页面 · ${relations.length} 组关联${view.center ? ' · 含双向链接与跨模块页面' : ''}`}
          </div>
          {visible.length ? (
            <GraphCanvas
              key={canvasKey}
              articles={visible}
              relations={relations}
              activeSlug={current?.slug}
              center={view.center}
              layout={layout}
              compact={compact}
              select={select}
            />
          ) : (
            <div className="empty-graph">
              没有匹配的节点。
              <button onClick={() => navigate?.(view.query ? { ...view, query: '' } : rootView)}>
                {view.query ? '清空搜索' : '返回全局图'}
              </button>
            </div>
          )}
          <div className="graph-legend">
            <span>
              <i
                style={{
                  background: current ? articleModules[current.module].nodeColor : 'var(--accent)',
                }}
              />
              {compact ? '颜色表示所属模块' : '颜色表示模块 · 大小表示连接数'}
            </span>
          </div>
          {compact ? (
            <Link className="graph-expand" href="/graph" aria-label="打开完整图谱">
              <Maximize2 size={16} />
            </Link>
          ) : (
            <div className="graph-layout-tools">
              <button
                onClick={() => setRevision((value) => value + 1)}
                title="重新排列节点"
                aria-label="重新排列节点"
              >
                <RotateCcw size={15} />
              </button>
              {!moduleOnly && (
                <button
                  onClick={() => setLayout(layout === 'connections' ? 'modules' : 'connections')}
                  title="切换布局"
                >
                  <Network size={15} />
                  <span>{layout === 'connections' ? '按模块排列' : '按关联排列'}</span>
                </button>
              )}
            </div>
          )}
        </div>
        {!compact && (
          <aside
            className="graph-inspector"
            aria-label="节点详情"
            style={
              current
                ? ({
                    '--node-color': articleModules[current.module].nodeColor,
                    '--node-ink': articleModules[current.module].color,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {current ? (
              <>
                <div className="eyebrow">
                  {moduleOnly
                    ? 'EXPLORE A MODULE'
                    : view.center
                      ? 'LOCAL EXPLORER'
                      : 'EXPLORE A PAGE'}
                </div>
                <div className="inspector-summary" key={current.slug}>
                  <span
                    className="pill"
                    style={{ color: 'color-mix(in srgb, var(--node-ink) 70%, var(--text))' }}
                  >
                    {articleModules[current.module].label}
                  </span>
                  {!!current.section?.length && (
                    <div className="graph-node-path">{current.section.join(' / ')}</div>
                  )}
                  {current.slug === view.center && (
                    <span className="graph-center-label">中心节点</span>
                  )}
                  <h2>{current.title}</h2>
                  <p>{current.description}</p>
                  {current.kind === 'module' && (
                    <p className="graph-module-summary">
                      包含 {current.articleCount} 篇文档，进入模块图查看功能分区与文章。
                    </p>
                  )}
                </div>
                <div className="inspector-actions">
                  {current.slug !== view.center && (
                    <button className="button quiet" onClick={() => explore(current.slug)}>
                      <Network size={16} />{' '}
                      {current.kind === 'module' ? '进入模块图谱' : '进入局部图谱'}{' '}
                      <ChevronRight size={16} />
                    </button>
                  )}
                  {current.url && (
                    <Link href={current.url} className="button primary">
                      {current.kind === 'module' ? '阅读模块说明' : '阅读这篇文档'}{' '}
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
                <div className="inspector-related">
                  <span className="eyebrow">
                    {moduleOnly ? '相连的模块' : '相连的页面'} · {neighbors.length}
                  </span>
                  <p className="graph-related-hint">
                    {moduleOnly
                      ? '连线汇总模块之间的文章阅读关联。'
                      : '选择一篇，继续探索它的局部图。'}
                  </p>
                  {neighbors.map((article) => (
                    <button
                      key={article.slug}
                      onClick={() => explore(article.slug)}
                      aria-label={
                        moduleOnly
                          ? `探索${article.title}模块图谱`
                          : `探索${article.title}的局部图谱`
                      }
                    >
                      <BookOpen size={14} />
                      {article.title}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                  {!neighbors.length && (
                    <p className="graph-related-hint">
                      {moduleOnly ? '该模块暂时没有跨模块阅读关联。' : '这篇文章暂时没有关联链接。'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="inspector-summary">
                <span className="eyebrow">图谱概览</span>
                <h2>{scopeTitle}</h2>
                <p>
                  {visible.length} 个{moduleOnly ? '模块' : '页面'} · {relations.length} 组阅读关联
                </p>
                <p>停留在节点上查看直接关联，单击查看详情，再打开文章或进入子图。</p>
              </div>
            )}
            <small>
              悬停或键盘聚焦查看关联 · 单击查看详情
              <br />
              左键牵引节点 · 空白平移 · 滚轮缩放
              <br />
              触屏点按查看详情 · 单指拖动、双指缩放
            </small>
          </aside>
        )}
      </div>
      {compact && current?.url && (
        <Link
          className="graph-selected-link"
          href={current.url}
          style={
            {
              '--node-color': articleModules[current.module].nodeColor,
              '--node-ink': articleModules[current.module].color,
            } as React.CSSProperties
          }
        >
          <span>
            <i className="status-dot" /> 正在探索 <strong>{current.title}</strong>
          </span>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

function NavigableGraph({ articles }: { articles: Article[] }) {
  const params = useSearchParams();
  const view = readGraphView(new URLSearchParams(params.toString()), articles);
  const navigate = useCallback((next: GraphView, replace = false) => {
    const url = new URL(window.location.href);
    url.search = '';
    if (next.module !== 'all') url.searchParams.set('module', next.module);
    if (next.section.length) url.searchParams.set('section', JSON.stringify(next.section));
    if (next.center) url.searchParams.set('center', next.center);
    if (next.query) url.searchParams.set('q', next.query);
    if (next.display !== globalGraphView.display) url.searchParams.set('display', next.display);
    if (url.href === window.location.href) return;
    // 原生 History API 与 Next 路由同步，静态站点也能分享子图及使用前进、后退。
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search);
  }, []);
  return <GraphExplorer articles={articles} view={view} navigate={navigate} />;
}

export function KnowledgeGraph({
  articles,
  compact = false,
}: {
  articles: Article[];
  compact?: boolean;
}) {
  if (compact) return <GraphExplorer articles={articles} compact />;
  return (
    <Suspense
      fallback={
        <div className="graph-loading" role="status">
          正在展开关系图谱…
        </div>
      }
    >
      <NavigableGraph articles={articles} />
    </Suspense>
  );
}
