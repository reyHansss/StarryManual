import type { Article } from './types';

// 模块只登记一次，子模块层级由文章的 section 路径生成，不用维护第二份文章清单。
export const articleModules = {
  manual: {
    label: '工程总览',
    shortLabel: '工程总览',
    color: '#9f6744',
    nodeColor: '#f4a65f',
    overview: 'start-here',
  },
  project: {
    label: '项目系统',
    shortLabel: '项目系统',
    color: '#496f87',
    nodeColor: '#8bb8df',
    overview: '',
  },
  astraai: {
    label: 'AstraAI · AI 决策',
    shortLabel: 'AstraAI',
    color: '#496f87',
    nodeColor: '#69b6ec',
    overview: 'astraai-overview',
  },
  halodebug: {
    label: 'HaloDebug · 调试工具',
    shortLabel: 'HaloDebug',
    color: '#ad5360',
    nodeColor: '#ed819a',
    overview: 'halodebug-overview',
  },
  input: {
    label: 'Input · 玩家输入',
    shortLabel: 'Input',
    color: '#40786a',
    nodeColor: '#73c9ac',
    overview: 'input-overview',
  },
  asyncmessage: {
    label: 'Async Message · 异步消息',
    shortLabel: 'Async Message',
    color: '#a36334',
    nodeColor: '#f2b25e',
    overview: 'asyncmessage-overview',
  },
  authoring: {
    label: '手册维护',
    shortLabel: '手册维护',
    color: '#776294',
    nodeColor: '#b49cde',
    overview: 'writing',
  },
} as const;

export type ModuleKey = keyof typeof articleModules;
export type NavigationEntry =
  | { kind: 'article'; article: Article }
  | { kind: 'section'; label: string; path: string[]; entries: NavigationEntry[] };
export type ModuleNavigation = {
  key: ModuleKey;
  label: string;
  color: string;
  overview?: Article;
  entries: NavigationEntry[];
};

export function getArticleModule(slug: string): ModuleKey {
  if (slug === 'start-here' || slug === 'architecture') return 'manual';
  if (slug === 'writing' || slug === 'blueprint-nodes') return 'authoring';
  for (const key of Object.keys(articleModules) as ModuleKey[]) {
    if (slug.startsWith(`${key}-`)) return key;
  }
  return 'project';
}

/** 按文章所属模块和从外到内的功能路径建立目录树。 */
export function buildModuleNavigation(articles: Article[]): ModuleNavigation[] {
  const sorted = [...articles].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  return (Object.entries(articleModules) as [ModuleKey, (typeof articleModules)[ModuleKey]][])
    .map(([key, module]) => {
      const pages = sorted.filter((article) => article.module === key);
      const entries: NavigationEntry[] = [];
      for (const article of pages) {
        let children = entries;
        const path: string[] = [];
        for (const label of article.section ?? []) {
          path.push(label);
          let group = children.find((entry) => entry.kind === 'section' && entry.label === label);
          if (!group) {
            group = { kind: 'section', label, path: [...path], entries: [] };
            children.push(group);
          }
          if (group.kind === 'section') children = group.entries;
        }
        children.push({ kind: 'article', article });
      }
      return {
        key,
        label: module.label,
        color: module.nodeColor,
        overview: pages.find((article) => article.slug === module.overview),
        entries,
      };
    })
    .filter((module) => module.entries.length > 0);
}

export function flattenNavigation(entries: NavigationEntry[]): Article[] {
  return entries.flatMap((entry): Article[] =>
    entry.kind === 'article' ? [entry.article] : flattenNavigation(entry.entries),
  );
}

/** 阅读顺序遵循当前模块的目录，不在模块末尾自动跳入其他系统。 */
export function getReadingNeighbors(module: ModuleNavigation, slug: string) {
  const pages = flattenNavigation(module.entries);
  const index = pages.findIndex((article) => article.slug === slug);
  return {
    previous: index > 0 ? pages[index - 1] : undefined,
    next: index >= 0 ? pages[index + 1] : undefined,
  };
}

export function getArticleLabel(article: Article) {
  return article.title.replace(/^(AstraAI|HaloDebug|Input|Async Message) · /, '');
}

export function getSectionAnchor(path: string[]) {
  return `section-${JSON.stringify(path)}`;
}
