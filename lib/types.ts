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
  guide: { label: '使用指南', english: 'GUIDE', color: '#12806e' },
  architecture: { label: '技术架构', english: 'ARCHITECTURE', color: '#3467d6' },
  reference: { label: '节点与参考', english: 'REFERENCE', color: '#b94f77' },
};
