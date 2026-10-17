import assert from 'node:assert/strict';
import test from 'node:test';
import { getDiagramViewport } from '../lib/diagram.ts';

test('宽图和高图的默认视图保留可读字号，并露出图表起始边缘', () => {
  const wide = getDiagramViewport({ width: 1200, height: 180 }, { width: 360, height: 220 });
  assert.equal(wide.zoom, 0.9);
  assert.equal(wide.x, 24);
  assert.ok(wide.y >= 24);
  const tall = getDiagramViewport({ width: 400, height: 1000 }, { width: 720, height: 480 });
  assert.equal(tall.zoom, 0.9);
  assert.equal(tall.y, 24);
  assert.ok(tall.x >= 24);
});

test('手机窄画布、桌面宽画布和全屏画布均可完整适配宽图或高图', () => {
  for (const diagram of [
    { width: 1200, height: 180 },
    { width: 400, height: 1000 },
  ]) {
    for (const canvas of [
      { width: 350, height: 220 },
      { width: 850, height: 480 },
      { width: 1900, height: 860 },
    ]) {
      const view = getDiagramViewport(diagram, canvas, true);
      assert.ok(view.zoom > 0 && view.zoom <= 1);
      assert.ok(view.x >= 24 - 1e-8);
      assert.ok(view.y >= 24 - 1e-8);
      assert.ok(view.x + diagram.width * view.zoom <= canvas.width - 24 + 1e-8);
      assert.ok(view.y + diagram.height * view.zoom <= canvas.height - 24 + 1e-8);
    }
  }
});

test('小图保持原始比例并居中，适配不自动放大文字', () => {
  const diagram = { width: 200, height: 100 };
  const canvas = { width: 800, height: 500 };
  const expected = { x: 300, y: 200, zoom: 1 };
  assert.deepEqual(getDiagramViewport(diagram, canvas), expected);
  assert.deepEqual(getDiagramViewport(diagram, canvas, true), expected);
  assert.deepEqual(diagram, { width: 200, height: 100 });
  assert.deepEqual(canvas, { width: 800, height: 500 });
});

test('超宽图的适配比例可低于普通缩放下限，仍完整显示全部内容', () => {
  const diagram = { width: 20000, height: 400 };
  const canvas = { width: 350, height: 220 };
  const view = getDiagramViewport(diagram, canvas, true);
  assert.ok(view.zoom < 0.05);
  assert.ok(view.x >= 24 - 1e-8);
  assert.ok(view.x + diagram.width * view.zoom <= canvas.width - 24 + 1e-8);
});
