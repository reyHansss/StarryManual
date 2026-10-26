import assert from 'node:assert/strict';
import test from 'node:test';
import { getSearchText, searchArticles, splitMatches } from '../lib/search.ts';

const article = (slug, order, title, description = '', text = '') => ({
  slug,
  order,
  title,
  description,
  text,
  module: 'project',
  section: [],
  url: `/read/${slug}`,
  links: [],
});

test('正文组件只保留标题，代码与真实文字保持可搜索', () => {
  const text = getSearchText(
    [
      '## 取得系统',
      '',
      '调用 `GetSharedMessageSystem<FAsyncGameplayMessageSystem>()` 后检查结果，见[项目消息](/read/asyncmessage-project#发送)。',
      '',
      '<Diagram',
      '  title="三种顺序分别影响什么"',
      "  source={'flowchart TB\\n  A(甲) -->|决定| B(乙)'}",
      '/>',
      '',
      '<BlueprintViewer',
      '  title="监听：保存任务"',
      '  source={\'Begin Object Class=/Script/BlueprintGraph.K2Node_MakeStruct Name="MakeMessageId"\\nEnd Object\'}',
      '/>',
      '',
      '| 操作 | 结果 |',
      '| --- | :---: |',
      '| **添加** | 替换 |',
      '',
      '```cpp',
      'TSharedPtr<FAsyncGameplayMessageSystem> System;',
      '```',
    ].join('\n'),
  );
  assert.match(text, /GetSharedMessageSystem<FAsyncGameplayMessageSystem>\(\)/);
  assert.match(text, /TSharedPtr<FAsyncGameplayMessageSystem> System;/);
  assert.match(text, /三种顺序分别影响什么/);
  assert.match(text, /监听：保存任务/);
  assert.match(text, /项目消息/);
  assert.match(text, /添加 替换/);
  assert.doesNotMatch(text, /flowchart|Begin Object|K2Node|\/read\/|---|\*\*/);
});

test('标题命中优先，多个关键词须全部命中，同分保持目录顺序', () => {
  const articles = [
    article('a', 1, '工程分层', '说明依赖方向', '输入缓存在这里只被提到一次'),
    article('b', 2, 'Input · 通道输入缓存', '按通道保留命令'),
    article('c', 3, '输入总览', '玩家输入接入', '缓存与改键'),
    article('d', 4, '调试', '排查', '没有关键词'),
  ];
  assert.deepEqual(
    searchArticles(articles, '缓存').map((hit) => hit.article.slug),
    ['b', 'a', 'c'],
  );
  assert.deepEqual(
    searchArticles(articles, '输入  缓存').map((hit) => hit.article.slug),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(searchArticles(articles, '缓存 不存在'), []);
  assert.equal(searchArticles(articles, '   ').length, 4, '空查询列出全部文章');
});

test('只有正文命中时给出带省略号的片段，标题与简介已覆盖时不重复', () => {
  const body = `${'前文'.repeat(30)}Handler 在这里分派输入${'后文'.repeat(40)}`;
  const [hit] = searchArticles([article('a', 1, '动作处理', '能力分派', body)], 'handler');
  assert.ok(hit.excerpt.startsWith('…') && hit.excerpt.endsWith('…'));
  assert.match(hit.excerpt, /Handler 在这里分派输入/);
  assert.equal(
    searchArticles([article('a', 1, 'Handler', '', body)], 'handler')[0].excerpt,
    undefined,
  );
  const identifiers = `${'前文'.repeat(20)}UStarryInputManagerComponent 负责配置，IMC 与 Handler 组织为一份配置`;
  const [boundary] = searchArticles([article('b', 1, '接入', '', identifiers)], 'handler');
  assert.match(boundary.excerpt, /^…负责配置，IMC 与 Handler/, '片段不从英文标识符中间开始');
  const punctuation = `${'前文'.repeat(20)}处理 ，选择 Handler 分派`;
  const [trimmed] = searchArticles([article('c', 1, '接入', '', punctuation)], 'handler');
  assert.equal(trimmed.excerpt, '…选择 Handler 分派', '片段开头不留标点');
});

test('命中片段按位置切分并合并重叠', () => {
  assert.deepEqual(splitMatches('Input 输入缓存', ['input', '缓存']), [
    { text: 'Input', match: true },
    { text: ' 输入', match: false },
    { text: '缓存', match: true },
  ]);
  assert.deepEqual(splitMatches('abcd', ['abc', 'bcd']), [{ text: 'abcd', match: true }]);
  assert.deepEqual(splitMatches('无命中', ['x']), [{ text: '无命中', match: false }]);
});
