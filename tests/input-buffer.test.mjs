import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_BUFFER_CHANNEL,
  parseInputBufferScenario,
  simulateInputBuffer,
} from '../lib/input-buffer.ts';

const run = (source, mode) => {
  const { scenario, problems } = parseInputBufferScenario(source);
  assert.deepEqual(problems, []);
  return simulateInputBuffer(mode ? { ...scenario, mode } : scenario);
};

const attack = `处理器 Light 缓存 Attack
处理器 Heavy 缓存 Attack
处理器 Look 不缓存
处理器 Dodge 缓存 Move
动作 IA_Light Light Look
动作 IA_Heavy Heavy
动作 IA_Dodge Dodge
打开 Attack
输入 IA_Light
输入 IA_Heavy
关闭 Attack`;

test('通道打开时可缓存处理器入缓存，不可缓存处理器立即执行；关闭时按批内顺序执行', () => {
  const steps = run(attack, 'LastCommand');
  assert.deepEqual(steps[1].outcomes, [
    { kind: 'executed', handler: 'Look', delayed: false },
    { kind: 'stored', channel: 'Attack', handlers: ['Light'], replaced: undefined },
  ]);
  assert.deepEqual(steps[2].outcomes, [
    { kind: 'stored', channel: 'Attack', handlers: ['Heavy'], replaced: ['Light'] },
  ]);
  assert.deepEqual(steps[3].outcomes, [
    { kind: 'executed', handler: 'Heavy', delayed: true, channel: 'Attack' },
    { kind: 'closed', channel: 'Attack', open: true, empty: false },
  ]);
  assert.deepEqual(steps[3].open, []);
  assert.deepEqual(steps[3].stored, []);
});

test('FirstCommand 保留首批命令，窗口内后续同通道输入被丢弃且不执行', () => {
  const steps = run(attack, 'FirstCommand');
  assert.deepEqual(steps[2].outcomes, [
    { kind: 'dropped', channel: 'Attack', handlers: ['Heavy'], kept: ['Light'] },
  ]);
  assert.deepEqual(
    steps[3].outcomes.filter((item) => item.kind === 'executed').map((item) => item.handler),
    ['Light'],
  );
});

test('通道互不影响：未打开的通道照常立即执行，取消关闭丢弃已缓存命令', () => {
  const steps = run(`处理器 Light 缓存 Attack
处理器 Dodge 缓存 Move
动作 IA_Light Light
动作 IA_Dodge Dodge
打开 Attack
输入 IA_Dodge
输入 IA_Light
取消 Attack
关闭 Attack`);
  assert.deepEqual(steps[1].outcomes, [{ kind: 'executed', handler: 'Dodge', delayed: false }]);
  assert.deepEqual(steps[3].outcomes, [
    { kind: 'discarded', channel: 'Attack', handlers: ['Light'] },
    { kind: 'closed', channel: 'Attack', open: true, empty: false },
  ]);
  assert.deepEqual(steps[4].outcomes, [
    { kind: 'closed', channel: 'Attack', open: false, empty: true },
  ]);
});

test('同一次输入的多个处理器按通道分组，同通道保持登记顺序', () => {
  const steps = run(`处理器 A 缓存 Attack
处理器 B 缓存 Move
处理器 C 缓存 Attack
动作 IA_Combo A B C
打开 Attack
打开 Move
输入 IA_Combo
重置`);
  assert.deepEqual(steps[2].outcomes, [
    { kind: 'stored', channel: 'Attack', handlers: ['A', 'C'], replaced: undefined },
    { kind: 'stored', channel: 'Move', handlers: ['B'], replaced: undefined },
  ]);
  assert.deepEqual(steps[3].open, []);
  assert.deepEqual(steps[3].stored, []);
});

test('Disabled 时打开通道也不缓存，处理器全部立即执行', () => {
  const steps = run(attack, 'Disabled');
  assert.deepEqual(
    steps.flatMap((step) => step.outcomes.filter((item) => item.kind === 'executed')),
    [
      { kind: 'executed', handler: 'Light', delayed: false },
      { kind: 'executed', handler: 'Look', delayed: false },
      { kind: 'executed', handler: 'Heavy', delayed: false },
    ],
  );
});

test('处理器省略通道时使用默认通道，场景文本报告无法识别的行', () => {
  const { scenario, problems } = parseInputBufferScenario(`模式 FirstCommand
处理器 Light 缓存
处理器 Bad 也许
未知 指令`);
  assert.equal(scenario.mode, 'FirstCommand');
  assert.equal(scenario.handlers[0].channel, DEFAULT_BUFFER_CHANNEL);
  assert.equal(problems.length, 2);
});
