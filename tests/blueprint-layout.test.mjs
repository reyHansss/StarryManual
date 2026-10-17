import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getBlueprintWire,
  getStraightenedPositions,
  updateBlueprintPositions,
} from '../public/blueprint/layout.js';

test('位置回写保留节点类型、引脚连接、嵌套对象和换行', () => {
  const text = [
    'Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Outer"',
    '   Begin Object Name="Nested"',
    '      NodePosX=70',
    '      NodeGuid=BBBB',
    '   End Object',
    '   NodePosX=-80',
    '   NodePosY=30',
    '   NodeGuid=AAAA',
    '   CustomProperties Pin (PinId=CCCC,LinkedTo=(Other DDDD,))',
    'End Object',
    '',
  ].join('\r\n');
  const next = updateBlueprintPositions(text, new Map([['AAAA', { x: 15.6, y: -12 }]]));
  assert.equal(
    next,
    text.replace('NodePosX=-80', 'NodePosX=16').replace('NodePosY=30', 'NodePosY=-12'),
  );
  assert.equal(updateBlueprintPositions(next, new Map([['AAAA', { x: 16, y: -12 }]])), next);
});

test('原文本省略零坐标时只补实际需要的位置字段', () => {
  const text = 'Begin Object Name="Node"\n   NodeGuid=AAAA\nEnd Object';
  assert.equal(updateBlueprintPositions(text, new Map([['AAAA', { x: 0, y: 0 }]])), text);
  assert.equal(
    updateBlueprintPositions(text, new Map([['AAAA', { x: 0, y: 24 }]])),
    text.replace('   NodeGuid=', '   NodePosY=24\n   NodeGuid='),
  );
});

test('执行线优先拉直，纯节点对齐引脚，冲突载荷线保留弯曲并避免重叠', () => {
  const nodes = [
    { id: 'listen', x: 300, y: 0, width: 320, height: 146 },
    { id: 'save', x: 650, y: -90, width: 210, height: 66 },
    { id: 'read', x: 1000, y: 85, width: 220, height: 120 },
    { id: 'make', x: -80, y: 80, width: 308, height: 60 },
    { id: 'break', x: 650, y: 155, width: 265, height: 143 },
  ];
  const links = [
    { from: 'listen', to: 'save', fromY: 41, toY: 17, exec: true },
    { from: 'listen', to: 'save', fromY: 71, toY: 47, exec: false },
    { from: 'listen', to: 'read', fromY: 97, toY: 41, exec: true },
    { from: 'make', to: 'listen', fromY: 42, toY: 71, exec: false },
    { from: 'listen', to: 'break', fromY: 128, toY: 42, exec: false },
    { from: 'break', to: 'read', fromY: 124, toY: 71, exec: false },
  ];
  const result = getStraightenedPositions(nodes, links);
  assert.equal(result.get('save').y, 24);
  assert.equal(result.get('read').y, 56);
  assert.equal(result.get('make').y, 29);
  assert.ok(result.get('break').y >= result.get('save').y + 66 + 12);
  for (const node of nodes) assert.equal(result.get(node.id).x, node.x);
  assert.deepEqual(getStraightenedPositions([], []), new Map());
});

test('平直、换行与回接路径均落在真实引脚上', () => {
  const straight = getBlueprintWire({ x: -100, y: 50 }, { x: 200, y: 50 });
  assert.equal(straight.path, 'M 0 0 L 300 0');
  assert.equal(straight.height, 2);
  const curve = getBlueprintWire({ x: 200, y: 100 }, { x: 20, y: -30 });
  assert.ok(curve.path.startsWith('M 180 130 C '));
  assert.ok(curve.path.endsWith('0 0'));
});
