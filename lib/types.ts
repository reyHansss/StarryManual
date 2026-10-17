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

export const categories: Record<Category, { label: string; english: string; color: string }> = {
  guide: { label: '使用指南', english: 'GUIDE', color: '#c9f17b' },
  architecture: { label: '技术架构', english: 'ARCHITECTURE', color: '#94baff' },
  reference: { label: '节点与参考', english: 'REFERENCE', color: '#c5a4ef' },
};
