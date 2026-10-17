'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import { ArrowRight, Maximize2, Search, Network, BookOpen } from 'lucide-react';
import { categories, type Article, type Category } from '@/lib/types';
import '@xyflow/react/dist/style.css';

type ArticleNode = Node<{ article: Article; focused: boolean; select: (slug: string) => void }>;
function ArticleCard({ data }: NodeProps<ArticleNode>) {
  const category = categories[data.article.category];
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
        className="node-title nodrag"
        aria-label={`选择${data.article.title}`}
        aria-pressed={data.focused}
        onClick={() => data.select(data.article.slug)}
      >
        {data.article.title}
      </button>
      <Link
        href={data.article.url}
        className="node-open nodrag"
        aria-label={`打开${data.article.title}`}
      >
        <ArrowRight size={13} />
      </Link>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { article: ArticleCard };

export function KnowledgeGraph({
  articles,
  compact = false,
}: {
  articles: Article[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState('architecture');
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'orbit' | 'topics'>('orbit');
  const [revision, setRevision] = useState(0);
  const visible = articles.filter(
    (article) =>
      (filter === 'all' || article.category === filter) &&
      `${article.title} ${article.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const current = visible.find((article) => article.slug === selected) ?? visible[0];
  const activeSlug = current?.slug;
  const { nodes, edges } = useMemo(() => {
    const nodes: ArticleNode[] = visible.map((article, index) => {
      const angle = (index / Math.max(visible.length - 1, 1)) * Math.PI * 2 - Math.PI / 2;
      let position =
        index === 0
          ? { x: 340, y: 215 }
          : { x: 340 + Math.cos(angle) * 310, y: 215 + Math.sin(angle) * 205 };
      if (layout === 'topics') {
        const column = ['guide', 'architecture', 'reference'].indexOf(article.category);
        const row = visible
          .filter((item) => item.category === article.category)
          .findIndex((item) => item.slug === article.slug);
        position = { x: column * 260, y: row * 145 + (column === 1 ? 60 : 0) };
      }
      return {
        id: article.slug,
        type: 'article',
        position,
        data: { article, focused: activeSlug === article.slug, select: setSelected },
      };
    });
    const pairs = new Set<string>();
    const edges: Edge[] = [];
    visible.forEach((article) =>
      article.links.forEach((target) => {
        const pair = [article.slug, target].sort().join('--');
        if (
          target === article.slug ||
          !visible.some((item) => item.slug === target) ||
          pairs.has(pair)
        )
          return;
        pairs.add(pair);
        const highlighted = article.slug === activeSlug || target === activeSlug;
        edges.push({
          id: pair,
          source: article.slug,
          target,
          type: 'default',
          style: {
            stroke: highlighted ? 'var(--graph-edge-active)' : 'var(--graph-edge)',
            strokeWidth: highlighted ? 1.5 : 1,
            opacity: highlighted ? 0.85 : 0.5,
          },
        });
      }),
    );
    return { nodes, edges };
  }, [visible, layout, activeSlug]);
  const neighbors = current
    ? visible.filter(
        (article) =>
          article.slug !== current.slug &&
          (current.links.includes(article.slug) || article.links.includes(current.slug)),
      )
    : [];
  return (
    <div className={`knowledge-graph ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="graph-toolbar">
          <div className="filter-tabs">
            {(['all', 'guide', 'architecture', 'reference'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={filter === category ? 'selected' : ''}
              >
                {category === 'all' ? '全部主题' : categories[category].label}
              </button>
            ))}
          </div>
          <label className="graph-search">
            <Search size={15} />
            <input
              aria-label="筛选图谱文章"
              placeholder="查找节点"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      )}
      <div className="graph-body">
        <div className="graph-canvas">
          <div className="graph-caption">
            <i className="status-dot" />
            {compact ? '文档之间的真实关联' : `${nodes.length} 个页面 · ${edges.length} 组关联`}
          </div>
          {!!nodes.length ? (
            <ReactFlow
              key={`${filter}-${query}-${layout}-${revision}`}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: compact ? 0.25 : 0.35 }}
              minZoom={0.35}
              maxZoom={1.7}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              onNodeClick={(_, node) => setSelected(node.id)}
              zoomOnDoubleClick={false}
              panOnScroll={false}
              zoomOnScroll={!compact}
              preventScrolling={!compact}
              proOptions={{ hideAttribution: false }}
              aria-label="文章关系图谱"
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd2cf" />
              {!compact && <Controls showInteractive={false} />}
            </ReactFlow>
          ) : (
            <div className="empty-graph">
              没有匹配的节点。
              <button
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                重置筛选
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
            <button
              className="graph-expand"
              onClick={() => {
                setLayout(layout === 'orbit' ? 'topics' : 'orbit');
                setRevision(revision + 1);
              }}
              title="切换布局"
            >
              <Network size={16} />
              <span>{layout === 'orbit' ? '按主题排列' : '环形排列'}</span>
            </button>
          )}
        </div>
        {!compact && current && (
          <aside className="graph-inspector">
            <div className="eyebrow">SELECTED PAGE</div>
            <div className="inspector-summary" key={current.slug}>
              <span className="pill" style={{ color: categories[current.category].color }}>
                {categories[current.category].label}
              </span>
              <h2>{current.title}</h2>
              <p>{current.description}</p>
            </div>
            <Link href={current.url} className="button primary">
              阅读这篇文档 <ArrowRight size={16} />
            </Link>
            <div className="inspector-related">
              <span className="eyebrow">相连的页面 · {neighbors.length}</span>
              {neighbors.map((article) => (
                <button key={article.slug} onClick={() => setSelected(article.slug)}>
                  <BookOpen size={14} />
                  {article.title}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
            <small>
              单击选择 · 箭头打开文章
              <br />
              拖动画布平移，滚轮缩放
            </small>
          </aside>
        )}
      </div>
      {compact && current && (
        <Link className="graph-selected-link" href={current.url}>
          <span>
            <i className="status-dot" /> 正在探索 <strong>{current.title}</strong>
          </span>
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
