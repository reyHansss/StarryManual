import assert from 'node:assert/strict';
import test from 'node:test';
import {
  composeModifiers,
  parseModifierScenario,
  pathToString,
} from '../lib/stellaai-composition.ts';

const layers = (source) => {
  const { layers, problems } = parseModifierScenario(source);
  assert.deepEqual(problems, []);
  return layers;
};
const summary = (result) =>
  result.nodes.map((node) => [pathToString(node.path), node.kind, node.priority, node.layerName]);

// 对应 StellaAITests 的 StellaAI.Rework.Composition.SharedDefinitionsAndRestoration。
test('后层同路径完整替换组与行为，子项继承新根优先级，撤销后层恢复前层定义', () => {
  const core = `层 Core
AddGroup Combat 战斗组
AddBehavior Combat/Attack 攻击`;
  const overlay = `层 Overlay
AddGroup Combat Critical 新战斗组
AddBehavior Combat/Attack 加权攻击`;
  const both = composeModifiers(layers(`${core}\n${overlay}`));
  assert.equal(both.errors.length, 0);
  assert.deepEqual(summary(both), [
    ['Combat', 'group', 'Critical', 'Overlay'],
    ['Combat/Attack', 'behavior', 'Critical', 'Overlay'],
  ]);
  assert.deepEqual(
    both.trace.slice(2).map((item) => item.outcome),
    [
      { kind: 'replaced', previousLayer: 'Core' },
      { kind: 'replaced', previousLayer: 'Core' },
    ],
  );
  const restored = composeModifiers(layers(core));
  assert.deepEqual(summary(restored), [
    ['Combat', 'group', 'Normal', 'Core'],
    ['Combat/Attack', 'behavior', 'Normal', 'Core'],
  ]);
  const duplicate = composeModifiers(layers(`${core}\nAddBehavior Combat/Attack 重复`));
  assert.equal(duplicate.errors[0].outcome.reason, 'duplicate local Add; edit the existing entry');
});

test('只重定义组时保留原有子项，并把新优先级传给全部后代', () => {
  const result = composeModifiers(
    layers(`层 Base
AddGroup Ambient 日常
AddGroup Ambient/Town 城镇
AddBehavior Ambient/Town/Shop 购物
层 Alert
AddGroup Ambient Critical 警戒日常`),
  );
  assert.deepEqual(summary(result), [
    ['Ambient', 'group', 'Critical', 'Alert'],
    ['Ambient/Town', 'group', 'Critical', 'Base'],
    ['Ambient/Town/Shop', 'behavior', 'Critical', 'Base'],
  ]);
  assert.deepEqual(
    result.nodes.map((node) => node.parent),
    [-1, 0, 1],
  );
});

test('移除组连同全部后代，移除不存在的路径不报错', () => {
  const result = composeModifiers(
    layers(`层 Base
AddGroup Combat 战斗
AddBehavior Combat/Melee 近战
AddBehavior Idle 待机
层 Calm
RemoveGroup Combat
RemoveBehavior Missing`),
  );
  assert.deepEqual(summary(result), [['Idle', 'behavior', 'Normal', 'Base']]);
  assert.deepEqual(
    result.trace.slice(3).map((item) => item.outcome),
    [{ kind: 'removed', paths: ['Combat', 'Combat/Melee'] }, { kind: 'missing' }],
  );
});

test('缺少父组、组与行为类型冲突和非法路径都报错并跳过该条', () => {
  const result = composeModifiers(
    layers(`层 Base
AddBehavior Combat/Attack 攻击
AddBehavior Idle 待机
AddGroup Idle 同层同名先判为重复添加
RemoveGroup Idle
AddBehavior Bad//Path 非法
层 Overlay
AddGroup Idle 跨层同名组`),
  );
  assert.deepEqual(
    result.errors.map((item) => [item.layerName, item.path, item.outcome.reason]),
    [
      ['Base', 'Combat/Attack', 'missing parent group'],
      ['Base', 'Idle', 'duplicate local Add; edit the existing entry'],
      ['Base', 'Idle', 'group/behavior type conflict'],
      ['Base', 'Bad//Path', 'invalid path'],
      ['Overlay', 'Idle', 'group/behavior type conflict'],
    ],
  );
  assert.deepEqual(summary(result), [['Idle', 'behavior', 'Normal', 'Base']]);
});

test('子项的根优先级不生效，路径比较与排序不区分大小写', () => {
  const result = composeModifiers(
    layers(`层 Base
AddGroup combat 战斗
AddBehavior Combat/Zeta Critical 子项填写的优先级无效
AddBehavior Combat/alpha 第二
AddBehavior Ambient Critical 根行为`),
  );
  assert.deepEqual(summary(result), [
    ['Ambient', 'behavior', 'Critical', 'Base'],
    ['combat', 'group', 'Normal', 'Base'],
    ['Combat/alpha', 'behavior', 'Normal', 'Base'],
    ['Combat/Zeta', 'behavior', 'Normal', 'Base'],
  ]);
});

test('场景文本报告无法识别的行，层名缺省时自动编号', () => {
  const { layers: parsed, problems } = parseModifierScenario(`AddBehavior Idle
层
// 注释
Unknown Idle`);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, '第 1 层');
  assert.equal(problems.length, 2);
});
