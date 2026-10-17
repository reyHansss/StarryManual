import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGraphPositions,
  getGraphRelations,
  getLocalArticles,
  readGraphView,
} from '../lib/graph.ts';
import { createGraphMotion } from '../lib/graph-motion.ts';

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

const motionPoints = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 300, y: 0 },
  { id: 'far', x: 2000, y: 0 },
];
const motionRelations = [{ id: 'a::b', source: 'a', target: 'b' }];

test('拖动节点直接跟随输入，并通过弹力牵引邻居，远处独立节点不随之平移', () => {
  const input = structuredClone(motionPoints);
  const motion = createGraphMotion(input, motionRelations, 'connections');
  assert.equal(motion.isActive(), false);
  motion.update('a', { x: -180, y: 60 }, true);
  let positions;
  for (let step = 0; step < 20; step++) positions = motion.tick();
  assert.equal(positions[0].x, -180);
  assert.equal(positions[0].y, 60);
  assert.ok(positions[1].x < 270, '相连节点应该受到明显牵引');
  assert.equal(positions[2].x, 2000);
  assert.deepEqual(input, motionPoints, 'd3 的可写状态不能污染文章或初始坐标');
  assert.deepEqual(motionRelations, [{ id: 'a::b', source: 'a', target: 'b' }]);
  motion.stop();
});

test('松手后仍有连续余动，有限帧内衰减结束，新拖动可以打断并重新唤醒', () => {
  const motion = createGraphMotion(motionPoints, motionRelations, 'connections');
  motion.update('a', { x: -180, y: 60 }, true);
  for (let step = 0; step < 12; step++) motion.tick();
  motion.update('a', undefined, false);
  const first = motion.tick();
  const second = motion.tick();
  assert.notDeepEqual(first, second, '松手后不应瞬间停住或跳到最终坐标');
  assert.ok(Math.abs(second[0].x - first[0].x) < 30, '回稳应逐帧平滑');
  let frames = 0;
  while (motion.isActive() && frames < 240) {
    for (const point of motion.tick())
      assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    frames++;
  }
  assert.ok(frames > 15 && frames < 160, '回稳应有可感知的余动，并自动结束');
  motion.update('b', { x: 420, y: 80 }, true);
  assert.equal(motion.isActive(), true);
  const moved = motion.tick().find((point) => point.id === 'b');
  assert.equal(moved.x, 420);
  assert.equal(moved.y, 80);
  motion.stop();
  assert.equal(motion.isActive(), false);
});

test('减少动态效果立即停止余动，保留直接拖动，恢复偏好后不自行播放', () => {
  const motion = createGraphMotion(motionPoints, motionRelations, 'topics');
  motion.update('a', { x: -100, y: 60 }, true);
  motion.tick();
  motion.setReducedMotion(true);
  assert.equal(motion.isActive(), false);
  motion.update('b', { x: 400, y: 90 }, true);
  motion.update('b', undefined, false);
  assert.equal(motion.isActive(), false);
  const positions = motion.tick();
  assert.equal(positions[1].x, 400);
  assert.equal(positions[1].y, 90);
  motion.setReducedMotion(false);
  assert.equal(motion.isActive(), false);
  motion.stop();
  const empty = createGraphMotion([], [], 'connections');
  assert.deepEqual(empty.tick(), []);
  empty.stop();
});
