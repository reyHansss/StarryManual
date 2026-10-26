import type { Article } from './types';

export type SearchHit = {
  article: Article;
  /** 标题和简介没有覆盖全部关键词时，从正文截取首个命中附近的片段。 */
  excerpt?: string;
};

export type MatchSegment = { text: string; match: boolean };

const EXCERPT_BEFORE = 36;
const EXCERPT_AFTER = 64;
// 片段从窗口内第一个句读或空格之后开始，保留较多上文，又不从英文标识符中间截断。
const EXCERPT_BREAK = /[。！？；，、：\s]/;

/**
 * 把 MDX 正文整理成可搜索文字：代码保持原样，图表与蓝图只保留标题，
 * 其源码不进入搜索结果，也不随每个页面重复传给浏览器。
 */
export function getSearchText(content: string) {
  const code: string[] = [];
  const keep = (value: string) => ` \u0000${code.push(value) - 1}\u0000 `;
  return content
    .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, block: string) => keep(block))
    .replace(/`([^`\n]+)`/g, (_, inline: string) => keep(inline))
    .replace(/\bsource=\{\s*(?:'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)\s*\}/g, ' ')
    .replace(/<(?:Diagram|BlueprintViewer|Note)\b[^>]*?\btitle="([^"]*)"[^>]*>/g, ' $1 ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\]\([^)\s]*\)/g, ' ')
    .replace(/^[ \t]*\|?(?:[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*(?::?-{3,}:?)?[ \t]*$/gm, ' ')
    .replace(/[#*[\]|>]/g, ' ')
    .replace(/\u0000(\d+)\u0000/g, (_, index: string) => code[Number(index)])
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchTerms(query: string) {
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
}

/** 多个关键词须全部命中；标题优先于简介，简介优先于正文，同分保持目录顺序。 */
export function searchArticles(articles: Article[], query: string): SearchHit[] {
  const terms = getSearchTerms(query);
  if (!terms.length) return articles.map((article) => ({ article }));
  const hits: (SearchHit & { score: number })[] = [];
  for (const article of articles) {
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();
    const text = article.text.toLowerCase();
    let score = 0;
    let bodyTerm: string | undefined;
    for (const term of terms) {
      if (title.includes(term)) score += 10;
      else if (description.includes(term)) score += 4;
      else if (text.includes(term)) {
        score += 1;
        bodyTerm ??= term;
      } else {
        score = -1;
        break;
      }
    }
    if (score < 0) continue;
    hits.push({
      article,
      score,
      excerpt: bodyTerm
        ? getExcerpt(article.text, text.indexOf(bodyTerm), bodyTerm.length)
        : undefined,
    });
  }
  return hits
    .sort((a, b) => b.score - a.score || a.article.order - b.article.order)
    .map(({ article, excerpt }) => ({ article, excerpt }));
}

function getExcerpt(text: string, index: number, length: number) {
  const earliest = Math.max(0, index - EXCERPT_BEFORE);
  const lead = earliest > 0 ? text.slice(earliest, index).search(EXCERPT_BREAK) : -1;
  let start = lead >= 0 ? earliest + lead + 1 : earliest;
  while (start < index && EXCERPT_BREAK.test(text[start])) start++;
  const end = Math.min(text.length, index + length + EXCERPT_AFTER);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** 按关键词切分文字，供结果列表标出命中位置；重叠的命中合并为一段。 */
export function splitMatches(value: string, terms: string[]): MatchSegment[] {
  const lower = value.toLowerCase();
  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (
      let from = 0, index;
      (index = lower.indexOf(term, from)) !== -1;
      from = index + term.length
    ) {
      ranges.push([index, index + term.length]);
    }
  }
  if (!ranges.length) return [{ text: value, match: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const segments: MatchSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    const previous = segments.at(-1);
    if (start > cursor) segments.push({ text: value.slice(cursor, start), match: false });
    else if (previous?.match) {
      previous.text += value.slice(cursor, end);
      cursor = end;
      continue;
    }
    segments.push({ text: value.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), match: false });
  return segments;
}
