export type Category = 'guide' | 'architecture' | 'reference';
export type Article = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  order: number;
  url: string;
  links: string[];
  text: string;
};

// 模块由稳定的网址前缀归组，普通文章不必再维护一套目录元数据。
export const articleSections = {
  manual: { label: '项目总览', color: '#9f6744' },
  project: { label: '项目系统', color: '#496f87' },
  astraai: { label: 'AstraAI · AI 决策', color: '#496f87' },
  halodebug: { label: 'HaloDebug · 调试工具', color: '#ad5360' },
  input: { label: 'Input · 玩家输入', color: '#4b8071' },
  authoring: { label: '工具与创作', color: '#9f6744' },
} as const;

export function getArticleSection(slug: string): keyof typeof articleSections {
  if (slug === 'start-here' || slug === 'architecture') return 'manual';
  if (slug === 'writing' || slug === 'blueprint-nodes') return 'authoring';
  for (const section of Object.keys(articleSections) as (keyof typeof articleSections)[]) {
    if (slug.startsWith(`${section}-`)) return section;
  }
  return 'project';
}

/** 分类文字使用深色保证可读性，图谱标记使用更明快的同色系。 */
export const categories: Record<
  Category,
  { label: string; english: string; color: string; nodeColor: string }
> = {
  guide: { label: '使用指南', english: 'GUIDE', color: '#9f6744', nodeColor: '#f4a65f' },
  architecture: {
    label: '技术架构',
    english: 'ARCHITECTURE',
    color: '#496f87',
    nodeColor: '#69b6ec',
  },
  reference: { label: '节点与参考', english: 'REFERENCE', color: '#ad5360', nodeColor: '#ed819a' },
};
