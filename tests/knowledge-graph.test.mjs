import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGraphPositions,
  getGraphRelations,
  getLocalArticles,
  readGraphView,
} from '../lib/graph.ts';

const article = (slug, links, category = 'guide') => ({
  slug,
  links,
  category,
  title: slug,
  description: '',
  order: 0,
  url: `/read/${slug}`,
  text: '',
});
const articles = [
  article('a', ['a', 'b', 'missing']),
  article('b', ['a', 'd'], 'architecture'),
  article('c', ['a'], 'reference'),
  article('d', []),
  article('isolated', []),
];

test('合并双向引用并忽略自引用与站外目标', () => {
  assert.deepEqual(
    getGraphRelations(articles).map((relation) => relation.id),
    ['a::b', 'b::d', 'a::c'],
  );
});

test('局部图包含正向、反向和跨主题的一跳邻居，不引入二跳页面', () => {
  const local = getLocalArticles(articles, 'a');
  assert.deepEqual(
    local.map((item) => item.slug),
    ['a', 'b', 'c'],
  );
  assert.equal(getGraphRelations(local).length, 2);
  assert.deepEqual(
    getLocalArticles(articles, 'isolated').map((item) => item.slug),
    ['isolated'],
  );
});

test('网址可恢复主题、中心和搜索，未知主题与中心回到全局', () => {
  assert.deepEqual(
    readGraphView(new URLSearchParams('category=architecture&center=a&q=输入'), articles),
    { category: 'architecture', center: 'a', query: '输入' },
  );
  assert.deepEqual(
    readGraphView(new URLSearchParams('category=unknown&center=missing'), articles),
    { category: 'all', center: null, query: '' },
  );
});

test('关系布局确定且坐标有效，中心固定，空图和独立节点也能布局', () => {
  const before = structuredClone(articles);
  const relations = getGraphRelations(articles);
  const first = getGraphPositions(articles, relations, 'connections', 'a');
  assert.deepEqual(first, getGraphPositions(articles, relations, 'connections', 'a'));
  assert.deepEqual(first.get('a'), { x: 0, y: 0 });
  for (const position of first.values()) {
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
  }
  assert.equal(
    new Set([...first.values()].map((point) => `${point.x}:${point.y}`)).size,
    articles.length,
  );
  assert.equal(getGraphPositions([], [], 'connections', null).size, 0);
  assert.equal(getGraphPositions([articles[4]], [], 'topics', null).size, 1);
  assert.deepEqual(articles, before);
});
