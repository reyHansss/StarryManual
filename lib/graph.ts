import type { Article, Category } from './types';

export type GraphRelation = { id: string; source: string; target: string };
export type GraphView = { category: Category | 'all'; center: string | null; query: string };
export const globalGraphView: GraphView = { category: 'all', center: null, query: '' };

// 阅读关系不分方向；反向链接合并，自引用和目录外的目标不进入图谱。
export function getGraphRelations(articles: Article[]): GraphRelation[] {
  const slugs = new Set(articles.map((article) => article.slug));
  const relations = new Map<string, GraphRelation>();
  for (const article of articles) {
    for (const target of article.links) {
      if (target === article.slug || !slugs.has(target)) continue;
      const pair = [article.slug, target].sort();
      const id = pair.join('::');
      relations.set(id, { id, source: pair[0], target: pair[1] });
    }
  }
  return [...relations.values()];
}

export function getLocalArticles(articles: Article[], center: string): Article[] {
  const connected = new Set([center]);
  for (const relation of getGraphRelations(articles)) {
    if (relation.source === center) connected.add(relation.target);
    if (relation.target === center) connected.add(relation.source);
  }
  return articles.filter((article) => connected.has(article.slug));
}

export function readGraphView(params: URLSearchParams, articles: Article[]): GraphView {
  const category = params.get('category');
  const center = params.get('center');
  return {
    category:
      category === 'guide' || category === 'architecture' || category === 'reference'
        ? category
        : 'all',
    center: articles.some((article) => article.slug === center) ? center : null,
    query: params.get('q') ?? '',
  };
}

// 自动布局只产生当前视图的初始位置，之后由读者拖动，不写回文章内容。
export function getGraphPositions(
  articles: Article[],
  relations: GraphRelation[],
  layout: 'connections' | 'topics',
  center: string | null,
): Map<string, { x: number; y: number }> {
  if (layout === 'topics') {
    const rows = new Map<string, number>();
    const topics = ['guide', 'architecture', 'reference'].filter((category) =>
      articles.some((article) => article.category === category),
    );
    return new Map(
      articles.map((article) => {
        const row = rows.get(article.category) ?? 0;
        rows.set(article.category, row + 1);
        return [article.slug, { x: topics.indexOf(article.category) * 310, y: row * 170 }];
      }),
    );
  }

  const outer = articles.filter((article) => article.slug !== center);
  const radius = Math.max(260, Math.sqrt(articles.length) * 140);
  const points = articles.map((article) => {
    const angle = (outer.indexOf(article) / Math.max(outer.length, 1)) * Math.PI * 2;
    return {
      slug: article.slug,
      x: article.slug === center ? 0 : Math.cos(angle) * radius,
      y: article.slug === center ? 0 : Math.sin(angle) * radius * 0.8,
    };
  });
  const bySlug = new Map(points.map((point, index) => [point.slug, index]));
  const spacing = 235;
  // 有限次排斥与连线吸引生成初始排布，交互期间再由画布唤醒实时牵引。
  for (let step = 0; step < 180; step++) {
    const movement = points.map((point) => ({ x: -point.x * 0.08, y: -point.y * 0.08 }));
    for (let a = 0; a < points.length; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const dx = points[a].x - points[b].x;
        const dy = points[a].y - points[b].y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const force = (spacing * spacing) / distance;
        movement[a].x += (dx / distance) * force;
        movement[a].y += (dy / distance) * force;
        movement[b].x -= (dx / distance) * force;
        movement[b].y -= (dy / distance) * force;
      }
    }
    for (const relation of relations) {
      const a = bySlug.get(relation.source)!;
      const b = bySlug.get(relation.target)!;
      const dx = points[a].x - points[b].x;
      const dy = points[a].y - points[b].y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const force = ((distance * distance) / spacing) * 0.3;
      movement[a].x -= (dx / distance) * force;
      movement[a].y -= (dy / distance) * force;
      movement[b].x += (dx / distance) * force;
      movement[b].y += (dy / distance) * force;
    }
    const temperature = 28 * (1 - step / 180);
    points.forEach((point, index) => {
      if (point.slug === center) return;
      const delta = movement[index];
      const length = Math.max(Math.hypot(delta.x, delta.y), 1);
      const scale = Math.min(length, temperature) / length;
      point.x += delta.x * scale;
      point.y += delta.y * scale;
    });
  }
  // 横向展开阅读空间，减少为容纳纵向连线而将标题缩得过小的情况。
  return new Map(points.map((point) => [point.slug, { x: point.x, y: point.y * 0.5 }]));
}
