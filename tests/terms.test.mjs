import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectTerms,
  countTermPlacements,
  filterTerms,
  getTermAnchor,
  normalizeTerms,
} from '../lib/terms.ts';
import { findTermByName, searchArticles } from '../lib/search.ts';

const article = (slug, module, terms, extra = {}) => ({
  slug,
  module,
  terms,
  title: slug,
  description: '',
  order: 0,
  section: [],
  url: `/read/${slug}`,
  links: [],
  text: '',
  ...extra,
});

const experience = {
  term: 'Experience',
  aliases: ['UStarryExperienceDefinition'],
  brief: '一局游戏的装配清单。',
};
const buffer = { term: '输入缓存', aliases: ['Input Buffer'], brief: '在动画窗口内暂存输入。' };

test('元信息中的术语整理为统一结构，格式不符的条目被忽略', () => {
  assert.deepEqual(
    normalizeTerms([
      { term: ' Experience ', brief: '装配清单', aliases: ['A', '', 3] },
      { term: '', brief: '空名称' },
      { brief: '缺名称' },
      'text',
    ]),
    [{ term: 'Experience', aliases: ['A'], brief: '装配清单' }],
  );
  assert.deepEqual(normalizeTerms(undefined), []);
});

test('术语汇总带回定义文章的锚点，并按名称排序', () => {
  const entries = collectTerms([
    article('input-overview', 'input', [buffer]),
    article('framework-overview', 'framework', [experience]),
  ]);
  assert.deepEqual(
    entries.map((entry) => [entry.term, entry.module, entry.url]),
    [
      ['Experience', 'framework', `/read/framework-overview#${getTermAnchor('Experience')}`],
      ['输入缓存', 'input', `/read/input-overview#${getTermAnchor('输入缓存')}`],
    ],
  );
  assert.equal(getTermAnchor('Modifier Stack'), 'term-Modifier-Stack');
});

test('筛选同时匹配名称、别名与解释，多个关键词须全部命中', () => {
  const entries = [experience, buffer];
  assert.deepEqual(filterTerms(entries, 'input buffer'), [buffer]);
  assert.deepEqual(filterTerms(entries, '装配'), [experience]);
  assert.deepEqual(filterTerms(entries, '  '), entries);
  assert.equal(findTermByName({ terms: entries }, 'ustarryexperience'), experience);
});

test('正文中 <Terms /> 的放置次数不计代码示例', () => {
  assert.equal(countTermPlacements('## 核心概念\n\n<Terms />\n\n其余正文'), 1);
  assert.equal(countTermPlacements('<Terms/>\n\n<Terms />'), 2);
  assert.equal(countTermPlacements('写法是 `<Terms />`。\n\n```mdx\n<Terms />\n```\n'), 0);
});

test('搜索命中术语名或别名时排在正文命中之前，并以定义作为片段', () => {
  const hits = searchArticles(
    [
      article('body-only', 'project', [], { text: '这里提到了 Experience 的加载。' }),
      article('framework-overview', 'framework', [experience]),
    ],
    'experience',
  );
  assert.deepEqual(
    hits.map((hit) => hit.article.slug),
    ['framework-overview', 'body-only'],
  );
  assert.equal(hits[0].excerpt, 'Experience：一局游戏的装配清单。');
  assert.equal(searchArticles([article('a', 'input', [buffer])], 'input buffer').length, 1);
});
