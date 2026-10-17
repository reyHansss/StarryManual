'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
  type Edge,
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
import { categories, type Article } from '@/lib/types';
import { useGraphMotion } from './use-graph-motion';
import {
  getGraphPositions,
  getGraphRelations,
  getLocalArticles,
  globalGraphView,
  readGraphView,
  type GraphRelation,
  type GraphView,
} from '@/lib/graph';
import '@xyflow/react/dist/style.css';

type ArticleNode = Node<{
  article: Article;
  focused: boolean;
  center: boolean;
  compact: boolean;
  degree: number;
  select: (slug: string) => void;
  explore: (slug: string) => void;
}>;

function ArticlePoint({ data }: NodeProps<ArticleNode>) {
  const category = categories[data.article.category];
  const zoom = useStore((state) => state.transform[2]);
  if (data.compact) {
    return (
      <div
        className={`atlas-node ${data.focused ? 'focused' : ''}`}
        style={{ '--node-color': category.color } as React.CSSProperties}
      >
        <Handle type="target" position={Position.Left} />
        <div className="node-category">
          <i />
          {category.english}
        </div>
        <button
          className="node-title nodrag nopan"
          aria-label={`选择${data.article.title}`}
          aria-pressed={data.focused}
          onClick={() => data.select(data.article.slug)}
        >
          {data.article.title}
        </button>
        <Link
          href={data.article.url}
          className="node-open nodrag nopan"
          aria-label={`打开${data.article.title}`}
        >
          <ArrowRight size={13} />
        </Link>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }
  return (
    <div
      className={`atlas-dot-node ${data.focused ? 'focused' : ''} ${data.center ? 'is-center' : ''}`}
      style={
        {
          '--node-color': category.color,
          '--node-size': `${16 + Math.min(data.degree, 6) * 2}px`,
          '--graph-label-size': `${Math.min(data.focused ? 42 : 30, Math.max(15, 13 / zoom))}px`,
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} />
      <span className="node-point" aria-hidden="true">
        <i />
      </span>
      <button
        className="dot-title nodrag nopan"
        aria-label={`选择${data.article.title}`}
        aria-pressed={data.focused}
        onClick={() => data.select(data.article.slug)}
      >
        {data.article.title}
      </button>
      {data.focused && (
        <div className="dot-actions nodrag nopan">
          <button
            onClick={(event) => {
              event.stopPropagation();
              data.explore(data.article.slug);
            }}
            aria-label={`进入${data.article.title}的局部图谱`}
            title="进入局部图谱"
          >
            <Network size={14} />
          </button>
          <Link href={data.article.url} aria-label={`打开${data.article.title}`} title="阅读文章">
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { article: ArticlePoint };

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
  explore,
}: {
  articles: Article[];
  relations: GraphRelation[];
  activeSlug: string | undefined;
  center: string | null;
  layout: 'connections' | 'topics';
  compact: boolean;
  select: (slug: string) => void;
  explore: (slug: string) => void;
}) {
  const [initialNodes] = useState(() => {
    const positions = getGraphPositions(articles, relations, layout, center);
    return articles.map((article, index): ArticleNode => {
      // 首页保留紧凑卡片预览；完整图使用关系布局与可拖动的圆点节点。
      const angle = (index / Math.max(articles.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      const previewPosition =
        index === 0
          ? { x: 340, y: 215 }
          : { x: 340 + Math.cos(angle) * 310, y: 215 + Math.sin(angle) * 205 };
      return {
        id: article.slug,
        type: 'article',
        position: compact ? previewPosition : positions.get(article.slug)!,
        ariaLabel: article.title,
        data: {
          article,
          focused: false,
          center: article.slug === center,
          compact,
          degree: relations.filter(
            (relation) => relation.source === article.slug || relation.target === article.slug,
          ).length,
          select,
          explore,
        },
      };
    });
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<ArticleNode>(initialNodes);
  const updateMotion = useGraphMotion(initialNodes, relations, layout, compact, setNodes);
  // 选择状态独立于位置，单击节点或更新详情不会抹掉读者的拖动结果。
  const displayNodes = nodes.map((node) => ({
    ...node,
    data: { ...node.data, focused: node.id === activeSlug, select, explore },
  }));
  const edges: Edge[] = relations.map((relation) => {
    const highlighted = relation.source === activeSlug || relation.target === activeSlug;
    return {
      ...relation,
      type: compact ? 'default' : 'straight',
      selectable: false,
      focusable: false,
      style: {
        stroke: highlighted ? 'var(--graph-edge-active)' : 'var(--graph-edge)',
        strokeWidth: highlighted ? 1.5 : 1,
        opacity: highlighted ? 0.9 : 0.4,
      },
    };
  });
  return (
    <ReactFlow
      nodes={displayNodes}
      edges={edges}
      onNodesChange={(changes) => {
        onNodesChange(changes);
        updateMotion(changes);
      }}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: compact ? 0.25 : 0.18, maxZoom: 1.3 }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable={!compact}
      nodesConnectable={false}
      onNodeClick={(_, node) => select(node.id)}
      onNodeDragStart={(_, node) => select(node.id)}
      deleteKeyCode={null}
      nodeDragThreshold={5}
      panOnDrag={[0]}
      zoomOnDoubleClick={false}
      panOnScroll={false}
      zoomOnScroll={!compact}
      preventScrolling={!compact}
      aria-label="文章关系图谱"
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
  const scopeKey = `${view.category}:${view.center ?? ''}:${view.query}`;
  const [selection, setSelection] = useState({
    scope: scopeKey,
    slug: view.center ?? 'architecture',
  });
  const [layout, setLayout] = useState<'connections' | 'topics'>('connections');
  const [revision, setRevision] = useState(0);
  const visible = useMemo(() => {
    const scoped = view.center
      ? getLocalArticles(articles, view.center)
      : articles.filter((article) => view.category === 'all' || article.category === view.category);
    const query = view.query.trim().toLowerCase();
    return scoped.filter((article) =>
      `${article.title} ${article.description}`.toLowerCase().includes(query),
    );
  }, [articles, view.center, view.category, view.query]);
  const relations = useMemo(() => getGraphRelations(visible), [visible]);
  // 内容更新时重建节点；选择变化不进入 key，保留读者刚刚拖动的位置。
  const canvasKey = JSON.stringify([
    scopeKey,
    layout,
    revision,
    visible.map((article) => [article.slug, article.title, article.category, article.links]),
  ]);
  const centerArticle = articles.find((article) => article.slug === view.center);
  const current =
    visible.find(
      (article) => article.slug === (selection.scope === scopeKey ? selection.slug : view.center),
    ) ??
    visible.find((article) => article.slug === view.center) ??
    visible[0];
  const neighbors = current
    ? getLocalArticles(articles, current.slug).filter((article) => article.slug !== current.slug)
    : [];
  function select(slug: string) {
    setSelection({ scope: scopeKey, slug });
  }
  function explore(slug: string) {
    navigate?.({ category: view.category, center: slug, query: '' });
  }
  const parentView = { category: view.category, center: null, query: '' };
  return (
    <div className={`knowledge-graph ${compact ? 'compact' : ''}`}>
      {!compact && (
        <>
          <div className="graph-navigation">
            <nav className="graph-breadcrumbs" aria-label="图谱路径">
              <button
                onClick={() => navigate?.(globalGraphView)}
                aria-current={!centerArticle && view.category === 'all' ? 'page' : undefined}
              >
                <Network size={15} /> 全局图
              </button>
              {view.category !== 'all' && (
                <>
                  <ChevronRight size={13} />
                  <button
                    onClick={() => navigate?.(parentView)}
                    aria-current={!centerArticle ? 'page' : undefined}
                  >
                    {categories[view.category].label}
                  </button>
                </>
              )}
              {centerArticle && (
                <>
                  <ChevronRight size={13} />
                  <span aria-current="page">{centerArticle.title}的局部图</span>
                </>
              )}
            </nav>
            {(centerArticle || view.category !== 'all') && (
              <button
                className="graph-up"
                onClick={() => navigate?.(centerArticle ? parentView : globalGraphView)}
              >
                <ArrowLeft size={14} />
                {centerArticle && view.category !== 'all' ? '返回主题图' : '返回全局图'}
              </button>
            )}
          </div>
          <div className="graph-toolbar">
            <div className="filter-tabs" aria-label="图谱主题">
              {(['all', 'guide', 'architecture', 'reference'] as const).map((category) => (
                <button
                  key={category}
                  style={
                    {
                      '--tab-color':
                        category === 'all' ? 'var(--accent)' : categories[category].color,
                    } as React.CSSProperties
                  }
                  onClick={() => navigate?.({ category, center: null, query: '' })}
                  className={!view.center && view.category === category ? 'selected' : ''}
                  aria-pressed={!view.center && view.category === category}
                >
                  {category === 'all' ? '全部' : categories[category].label}
                </button>
              ))}
            </div>
            <label className="graph-search">
              <Search size={15} />
              <input
                aria-label="筛选图谱文章"
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
              : `${visible.length} 个页面 · ${relations.length} 组关联${view.center ? ' · 含双向链接与跨主题页面' : ''}`}
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
              explore={explore}
            />
          ) : (
            <div className="empty-graph">
              没有匹配的节点。
              <button
                onClick={() => navigate?.(view.query ? { ...view, query: '' } : globalGraphView)}
              >
                {view.query ? '清空搜索' : '返回全局图'}
              </button>
            </div>
          )}
          <div className="graph-legend">
            {Object.entries(categories).map(([key, category]) => (
              <span key={key}>
                <i style={{ background: category.color }} />
                {category.label}
              </span>
            ))}
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
              <button
                onClick={() => setLayout(layout === 'connections' ? 'topics' : 'connections')}
                title="切换布局"
              >
                <Network size={15} />
                <span>{layout === 'connections' ? '按主题排列' : '按关联排列'}</span>
              </button>
            </div>
          )}
        </div>
        {!compact && current && (
          <aside
            className="graph-inspector"
            aria-label="节点详情"
            style={{ '--node-color': categories[current.category].color } as React.CSSProperties}
          >
            <div className="eyebrow">{view.center ? 'LOCAL EXPLORER' : 'EXPLORE A PAGE'}</div>
            <div className="inspector-summary" key={current.slug}>
              <span className="pill" style={{ color: categories[current.category].color }}>
                {categories[current.category].label}
              </span>
              {current.slug === view.center && <span className="graph-center-label">中心节点</span>}
              <h2>{current.title}</h2>
              <p>{current.description}</p>
            </div>
            <div className="inspector-actions">
              {current.slug !== view.center && (
                <button className="button quiet" onClick={() => explore(current.slug)}>
                  <Network size={16} /> 进入局部图谱 <ChevronRight size={16} />
                </button>
              )}
              <Link href={current.url} className="button primary">
                阅读这篇文档 <ArrowRight size={16} />
              </Link>
            </div>
            <div className="inspector-related">
              <span className="eyebrow">相连的页面 · {neighbors.length}</span>
              <p className="graph-related-hint">选择一篇，继续探索它的局部图。</p>
              {neighbors.map((article) => (
                <button
                  key={article.slug}
                  onClick={() => explore(article.slug)}
                  aria-label={`探索${article.title}的局部图谱`}
                >
                  <BookOpen size={14} />
                  {article.title}
                  <ChevronRight size={14} />
                </button>
              ))}
              {!neighbors.length && (
                <p className="graph-related-hint">这篇文章暂时没有关联链接。</p>
              )}
            </div>
            <small>
              单击选择 · <Network size={11} /> 进入局部图 · 箭头阅读
              <br />
              左键牵引节点 · 空白平移 · 滚轮缩放
              <br />
              触屏可单指拖动、双指缩放
            </small>
          </aside>
        )}
      </div>
      {compact && current && (
        <Link
          className="graph-selected-link"
          href={current.url}
          style={{ '--node-color': categories[current.category].color } as React.CSSProperties}
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
  function navigate(next: GraphView, replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('center');
    url.searchParams.delete('q');
    if (next.category !== 'all') url.searchParams.set('category', next.category);
    if (next.center) url.searchParams.set('center', next.center);
    if (next.query) url.searchParams.set('q', next.query);
    if (url.href === window.location.href) return;
    // 原生 History API 与 Next 路由同步，静态站点也能分享子图及使用前进、后退。
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search);
  }
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
          正在展开知识图谱…
        </div>
      }
    >
      <NavigableGraph articles={articles} />
    </Suspense>
  );
}
