import type { ModuleKey } from './navigation';

/** 文章元信息中登记的术语：定义只写在所属模块的文章里，术语页与搜索从这里汇总。 */
export type Term = {
  term: string;
  /** 英文名、类名或常见叫法，显示在术语名旁，并参与搜索与筛选。 */
  aliases: string[];
  /** 一句话解释，显示在定义文章、术语页与搜索结果中。 */
  brief: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  module: ModuleKey;
  section?: string[];
  order: number;
  url: string;
  links: string[];
  text: string;
  terms?: Term[];
  /** 正文用 `<Terms />` 指定了术语列表的位置；否则列在文末。 */
  inlineTerms?: boolean;
};
