export type Category = 'guide' | 'architecture' | 'reference';
export type Article = {
  slug: string;
  title: string;
  description: string;
  category: Category;
  section?: string[];
  order: number;
  url: string;
  links: string[];
  text: string;
};

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
