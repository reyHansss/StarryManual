import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGraphPositions,
  getGraphRelations,
  getLocalArticles,
  getGraphArticles,
  getGraphSections,
  globalGraphView,
  readGraphView,
} from '../lib/graph.ts';
import { createGraphMotion } from '../lib/graph-motion.ts';

const article = (slug, links, module = 'input', section = []) => ({
  slug,
  links,
  module,
  section,
  title: slug,
  description: '',
  order: 0,
  url: `/read/${slug}`,
  text: '',
});
const articles = [
  article('a', ['a', 'b', 'missing'], 'input', ['动作处理']),
  article('b', ['a', 'd'], 'astraai', ['行为执行']),
  article('c', ['a'], 'halodebug'),
  article('d', [], 'input', ['动作处理', '值与触发规则']),
  article('isolated', [], 'manual'),
];

test('合并双向引用并忽略自引用与站外目标', () => {
  assert.deepEqual(
    getGraphRelations(articles).map((relation) => relation.id),
    ['a::b', 'b::d', 'a::c'],
  );
});

test('局部图包含正向、反向和跨模块的一跳邻居，不引入二跳页面', () => {
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

test('网址恢复模块、完整功能路径、中心和搜索，无效范围不会隐藏内容', () => {
  const params = new URLSearchParams({
    module: 'input',
    section: JSON.stringify(['动作处理', '值与触发规则']),
    center: 'a',
    q: '输入',
  });
  assert.deepEqual(readGraphView(params, articles), {
    module: 'input',
    section: ['动作处理', '值与触发规则'],
    center: 'a',
    query: '输入',
  });
  assert.deepEqual(
    readGraphView(new URLSearchParams('module=unknown&section=invalid&center=missing'), articles),
    globalGraphView,
  );
  assert.deepEqual(
    readGraphView(new URLSearchParams('module=input&section=invalid'), articles).section,
    [],
  );
  assert.deepEqual(
    readGraphView(new URLSearchParams('category=architecture'), articles),
    globalGraphView,
  );
});

test('模块与功能筛选沿用文章层级，局部探索仍保留跨模块邻居', () => {
  assert.deepEqual(getGraphSections(articles, 'input'), [
    ['动作处理'],
    ['动作处理', '值与触发规则'],
  ]);
  const view = { ...globalGraphView, module: 'input', section: ['动作处理'] };
  assert.deepEqual(
    getGraphArticles(articles, view).map((item) => item.slug),
    ['a', 'd'],
  );
  assert.deepEqual(
    getGraphArticles(articles, { ...view, section: ['动作处理', '值与触发规则'] }).map(
      (item) => item.slug,
    ),
    ['d'],
  );
  assert.deepEqual(
    getGraphArticles(articles, { ...view, center: 'a' }).map((item) => item.slug),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    getGraphArticles(articles, { ...view, query: ' D ' }).map((item) => item.slug),
    ['d'],
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
  assert.equal(getGraphPositions([articles[4]], [], 'modules', null).size, 1);
  const modules = getGraphPositions(articles, relations, 'modules', null);
  assert.equal(modules.get('a').x, modules.get('d').x, '同一模块共用一列');
  assert.notEqual(modules.get('a').x, modules.get('b').x, '不同模块分列');
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
  const motion = createGraphMotion(motionPoints, motionRelations, 'modules');
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
