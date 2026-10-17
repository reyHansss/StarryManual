import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildModuleNavigation,
  flattenNavigation,
  getReadingNeighbors,
  getSectionAnchor,
} from '../lib/navigation.ts';

const article = (slug, order, section = [], category = 'guide') => ({
  slug,
  order,
  section,
  category,
  title: slug,
  description: '',
  url: `/read/${slug}`,
  links: [],
  text: '',
});

test('同一功能的使用与架构留在同一子模块，多层功能路径保持完整', () => {
  const pages = [
    article('astraai-backends', 4, ['行为执行', '树后端'], 'reference'),
    article('astraai-overview', 1),
    article('astraai-logic', 3, ['行为执行'], 'architecture'),
    article('astraai-usage', 2, ['行为执行']),
  ];
  const original = structuredClone(pages);
  const modules = buildModuleNavigation(pages);
  assert.equal(modules.length, 1, '未整理内容的模块不显示');
  const [module] = modules;
  assert.equal(module.overview.slug, 'astraai-overview');
  const execution = module.entries[1];
  assert.equal(execution.label, '行为执行');
  assert.deepEqual(execution.entries[2].path, ['行为执行', '树后端']);
  assert.deepEqual(
    flattenNavigation(module.entries).map((page) => page.slug),
    ['astraai-overview', 'astraai-usage', 'astraai-logic', 'astraai-backends'],
  );
  assert.deepEqual(pages, original, '构建目录不改写文章元信息');
});

test('不同模块中的同名子模块独立，阅读顺序按功能树且不越过模块边界', () => {
  const modules = buildModuleNavigation([
    article('astraai-overview', 1),
    article('astraai-logic', 2, ['运行']),
    article('astraai-objectives', 3, ['机会']),
    article('astraai-backends', 4, ['运行', '树后端']),
    article('input-overview', 5),
    article('input-binding', 6, ['运行']),
  ]);
  const astra = modules.find((module) => module.key === 'astraai');
  const input = modules.find((module) => module.key === 'input');
  assert.deepEqual(
    flattenNavigation(astra.entries).map((page) => page.slug),
    ['astraai-overview', 'astraai-logic', 'astraai-backends', 'astraai-objectives'],
  );
  assert.deepEqual(
    flattenNavigation(input.entries).map((page) => page.slug),
    ['input-overview', 'input-binding'],
  );
  assert.equal(getReadingNeighbors(astra, 'astraai-logic').next.slug, 'astraai-backends');
  assert.equal(getReadingNeighbors(astra, 'astraai-objectives').next, undefined);
  assert.equal(getReadingNeighbors(input, 'input-overview').previous, undefined);
  assert.deepEqual(getReadingNeighbors(astra, 'missing'), { previous: undefined, next: undefined });
});

test('未填写层级的导览仍可阅读，新系统文章保留项目系统入口', () => {
  const modules = buildModuleNavigation([
    article('start-here', 1),
    article('architecture', 2),
    article('ecology-overview', 3),
    article('writing', 99),
  ]);
  assert.deepEqual(
    modules.map((module) => module.key),
    ['manual', 'project', 'authoring'],
  );
  assert.equal(modules[1].entries[0].article.slug, 'ecology-overview');
});

test('子模块锚点区分同名层级与路径分隔字符，网址编码后能还原原始目标', () => {
  const first = getSectionAnchor(['执行/后端', 'BT']);
  const second = getSectionAnchor(['执行', '后端/BT']);
  assert.notEqual(first, second);
  assert.equal(decodeURIComponent(encodeURIComponent(first)), first);
});
