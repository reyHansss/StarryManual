import type { Article, Term } from './types';

/** 术语页中的一条：术语本身，加上定义它的文章。 */
export type TermEntry = Term & {
  slug: string;
  title: string;
  module: Article['module'];
  /** 指向定义文章中该术语的锚点。 */
  url: string;
};

/** 术语在定义文章中的锚点；空白换成短横线，其余字符原样保留。 */
export function getTermAnchor(term: string) {
  return `term-${term.trim().replace(/\s+/g, '-')}`;
}

/** 把元信息中的术语整理成统一结构；格式不符的条目由内容检查报告，这里只做容错。 */
export function normalizeTerms(value: unknown): Term[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Term[] => {
    if (!item || typeof item !== 'object') return [];
    const { term, aliases, brief } = item as Record<string, unknown>;
    if (typeof term !== 'string' || !term.trim() || typeof brief !== 'string') return [];
    return [
      {
        term: term.trim(),
        aliases: Array.isArray(aliases)
          ? aliases.filter((alias): alias is string => typeof alias === 'string' && !!alias.trim())
          : [],
        brief: brief.trim(),
      },
    ];
  });
}

/** 正文中 `<Terms />` 的放置次数；代码块与行内代码里的写法示例不计入。 */
export function countTermPlacements(content: string) {
  const prose = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
  return prose.match(/<Terms\b[^>]*\/>/g)?.length ?? 0;
}

// 英文名在前按字母顺序，中文名在后按拼音顺序；中文排序规则默认把汉字排在拉丁字母之前。
function compareTermNames(a: string, b: string) {
  const latinA = /^[\x00-\x7f]/.test(a);
  const latinB = /^[\x00-\x7f]/.test(b);
  if (latinA !== latinB) return latinA ? -1 : 1;
  return a.localeCompare(b, latinA ? 'en' : 'zh-Hans-CN', { sensitivity: 'base' });
}

/** 汇总全部文章登记的术语，英文名在前、中文名在后排序。 */
export function collectTerms(articles: Article[]): TermEntry[] {
  return articles
    .flatMap((article) =>
      (article.terms ?? []).map((term) => ({
        ...term,
        slug: article.slug,
        title: article.title,
        module: article.module,
        url: `${article.url}#${getTermAnchor(term.term)}`,
      })),
    )
    .sort((a, b) => compareTermNames(a.term, b.term));
}

/** 名称、别名或解释包含全部关键词的术语；关键词不区分大小写。 */
export function filterTerms<T extends Term>(entries: T[], query: string) {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!keywords.length) return entries;
  return entries.filter((entry) => {
    const text = [entry.term, ...entry.aliases, entry.brief].join(' ').toLowerCase();
    return keywords.every((keyword) => text.includes(keyword));
  });
}
