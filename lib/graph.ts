import type { Article } from './types';
import type { articleModules, ModuleKey } from './navigation';

export type GraphRelation = { id: string; source: string; target: string };
export type GraphModule = {
  kind: 'module';
  slug: string;
  title: string;
  description: string;
  module: ModuleKey;
  articleCount: number;
  url?: string;
  section?: never;
  links: string[];
};
export type GraphItem = (Article & { kind?: 'article' }) | GraphModule;
export type GraphView = {
  module: ModuleKey | 'all';
  section: string[];
  center: string | null;
  query: string;
  display: 'modules' | 'articles';
};
export const globalGraphView: GraphView = {
  module: 'all',
  section: [],
  center: null,
  query: '',
  display: 'modules',
};

// 阅读关系不分方向；反向链接合并，自引用和目录外的目标不进入图谱。
export function getGraphRelations(articles: Pick<GraphItem, 'slug' | 'links'>[]): GraphRelation[] {
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

export function getLocalArticles<T extends Pick<GraphItem, 'slug' | 'links'>>(
  articles: T[],
  center: string,
): T[] {
  const connected = new Set([center]);
  for (const relation of getGraphRelations(articles)) {
    if (relation.source === center) connected.add(relation.target);
    if (relation.target === center) connected.add(relation.source);
  }
  return articles.filter((article) => connected.has(article.slug));
}

/** 模块节点聚合全部文章的跨模块阅读链接，模块内链接不生成自环。 */
export function getModuleGraph(articles: Article[], modules: typeof articleModules): GraphModule[] {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  return (Object.keys(modules) as ModuleKey[]).flatMap((key) => {
    const pages = articles.filter((article) => article.module === key);
    if (!pages.length) return [];
    const module = modules[key];
    const overview = pages.find((article) => article.slug === module.overview);
    const links = new Set<string>();
    for (const article of pages) {
      for (const slug of article.links) {
        const target = bySlug.get(slug);
        if (target && target.module !== key) links.add(`module:${target.module}`);
      }
    }
    return [
      {
        kind: 'module' as const,
        slug: `module:${key}`,
        title: module.shortLabel,
        description: overview?.description ?? `${module.label}的功能说明与关联页面。`,
        module: key,
        articleCount: pages.length,
        url: overview?.url,
        links: [...links],
      },
    ];
  });
}

/** 功能分区沿用文章层级，包含每一层祖先，不维护额外的子图清单。 */
export function getGraphSections(articles: Article[], module: GraphView['module']): string[][] {
  const paths = new Map<string, string[]>();
  for (const article of articles) {
    if (article.module !== module) continue;
    const section = article.section ?? [];
    for (let depth = 1; depth <= section.length; depth++) {
      const path = section.slice(0, depth);
      paths.set(JSON.stringify(path), path);
    }
  }
  return [...paths.values()];
}

export function readGraphView(params: URLSearchParams, articles: Article[]): GraphView {
  const module =
    articles.find((article) => article.module === params.get('module'))?.module ?? 'all';
  const center = params.get('center');
  return {
    module,
    section:
      getGraphSections(articles, module).find(
        (path) => JSON.stringify(path) === params.get('section'),
      ) ?? [],
    center: articles.some((article) => article.slug === center) ? center : null,
    query: params.get('q') ?? '',
    display: params.get('display') === 'articles' ? 'articles' : 'modules',
  };
}

/** 局部图保留跨模块的一跳阅读关系，模块和功能范围用于返回原来的子图。 */
export function getGraphArticles(articles: Article[], view: GraphView): Article[] {
  const scoped = view.center
    ? getLocalArticles(articles, view.center)
    : articles.filter(
        (article) =>
          (view.module === 'all' || article.module === view.module) &&
          view.section.every((label, index) => article.section?.[index] === label),
      );
  const query = view.query.trim().toLowerCase();
  return scoped.filter((article) =>
    `${article.title} ${article.description}`.toLowerCase().includes(query),
  );
}

// 自动布局只产生当前视图的初始位置，之后由读者拖动，不写回文章内容。
export function getGraphPositions(
  articles: Pick<GraphItem, 'slug' | 'module'>[],
  relations: GraphRelation[],
  layout: 'connections' | 'modules',
  center: string | null,
): Map<string, { x: number; y: number }> {
  if (layout === 'modules') {
    const rows = new Map<string, number>();
    const modules = [...new Set(articles.map((article) => article.module))];
    return new Map(
      articles.map((article) => {
        const row = rows.get(article.module) ?? 0;
        rows.set(article.module, row + 1);
        return [article.slug, { x: modules.indexOf(article.module) * 310, y: row * 170 }];
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
