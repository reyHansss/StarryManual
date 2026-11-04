import type { Article } from './types';

// 模块只登记一次：文章按网址前缀（模块键加短横线）归入模块，子模块层级由文章的 section 路径生成。
export const articleModules = {
  start: {
    label: '项目总介绍',
    shortLabel: '项目总介绍',
    color: '#9f6744',
    nodeColor: '#f4a65f',
    overview: 'start-here',
  },
  framework: {
    label: '游戏框架',
    shortLabel: '游戏框架',
    color: '#4d58a3',
    nodeColor: '#8c97ee',
    overview: 'framework-overview',
  },
  stellaai: {
    label: 'StellaAI · AI 决策',
    shortLabel: 'StellaAI',
    color: '#496f87',
    nodeColor: '#69b6ec',
    overview: 'stellaai-overview',
  },
  stelladebug: {
    label: 'StellaDebug · 调试工具',
    shortLabel: 'StellaDebug',
    color: '#ad5360',
    nodeColor: '#ed819a',
    overview: 'stelladebug-overview',
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
  asyncmixin: {
    label: 'AsyncMixin · 异步加载',
    shortLabel: 'AsyncMixin',
    color: '#a25a76',
    nodeColor: '#ee9dbb',
    overview: 'asyncmixin-overview',
  },
  // 尚未登记模块的文章归入这里，等内容成形后再单独登记。
  project: {
    label: '项目系统',
    shortLabel: '项目系统',
    color: '#496f87',
    nodeColor: '#8bb8df',
    overview: '',
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

// 模块文章标题以“模块短名 · ”开头时，目录与面包屑省略这一段，新模块登记后自动生效。
const titlePrefix = new RegExp(
  `^(?:${Object.values(articleModules)
    .map((module) => module.shortLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')}) · `,
);

export function getArticleLabel(article: Article) {
  return article.title.replace(titlePrefix, '');
}

export function getSectionAnchor(path: string[]) {
  return `section-${JSON.stringify(path)}`;
}
