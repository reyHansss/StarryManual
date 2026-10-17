import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachBlueprintNavigation, getBlueprintFitView } from '../public/blueprint/navigation.js';

// 不模拟浏览器布局；直接验证输入监听、缩放锚点和手势生命周期。
function setup() {
  const frames = new Map();
  let frameId = 0;
  class Element {
    listeners = [];
    style = { transform: 'translate(20px, 60px) scale(1)' };
    captured = new Set();
    classes = new Set();
    classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, enabled) => (enabled ? this.classes.add(name) : this.classes.delete(name)),
    };
    clientHeight = 430;
    closest() {
      return null;
    }
    setAttribute() {}
    getBoundingClientRect() {
      return { left: 40, top: 70 };
    }
    setPointerCapture(id) {
      this.captured.add(id);
    }
    hasPointerCapture(id) {
      return this.captured.has(id);
    }
    releasePointerCapture(id) {
      this.captured.delete(id);
    }
    addEventListener(type, listener, options) {
      this.listeners.push({ type, listener, options });
    }
    emit(type, values = {}) {
      const event = {
        target: this,
        button: 0,
        pointerId: 1,
        deltaMode: 0,
        ctrlKey: false,
        preventDefault() {
          this.prevented = true;
        },
        stopImmediatePropagation() {
          this.stopped = true;
        },
        ...values,
      };
      for (const item of this.listeners) {
        if (item.type === type && !item.options.signal.aborted) item.listener(event);
        if (event.stopped) break;
      }
      return event;
    }
  }
  const layer = new Element();
  const canvas = new Element();
  const zoom = new Element();
  const reset = new Element();
  const elements = {
    '.layer': layer,
    '.canvas': canvas,
    '.frame-header__current-zoom': zoom,
    '.frame-header__buttons-reset': reset,
  };
  globalThis.window = new Element();
  globalThis.DOMMatrixReadOnly = class {
    constructor(transform) {
      const [, x, y, scale] = /translate\(([^p]+)px,\s*([^p]+)px\) scale\(([^)]+)\)/.exec(
        transform,
      );
      this.e = Number(x);
      this.f = Number(y);
      this.a = Number(scale);
    }
  };
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++frameId, callback);
    return frameId;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const renderer = {
    view: { x: 20, y: 60, scale: 1 },
    moveTo(x, y, scale) {
      this.view = { x, y, scale };
      canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    },
  };
  const detach = attachBlueprintNavigation(renderer, {
    querySelector: (selector) => elements[selector],
    querySelectorAll: () => [],
  });
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
  };
  const pointer = (type, id, x, y, extra = {}) => {
    layer.emit(type, { pointerId: id, clientX: x, clientY: y, ...extra });
    flush();
  };
  const wheel = (deltaY, extra = {}) => {
    const event = layer.emit('wheel', { deltaY, clientX: 300, clientY: 250, ...extra });
    flush();
    return event;
  };
  return { layer, canvas, zoom, reset, renderer, detach, flush, pointer, wheel };
}

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('自动取景包含负坐标节点，保留边距与缩放边界，小图不额外放大', () => {
  const bounds = [
    { x: -100, y: -150, width: 250, height: 100 },
    { x: 1000, y: 400, width: 200, height: 180 },
  ];
  const view = getBlueprintFitView(bounds, 700, 420);
  for (const box of bounds) {
    assert.ok(box.x * view.scale + view.x >= 24);
    assert.ok(box.y * view.scale + view.y >= 24);
    assert.ok((box.x + box.width) * view.scale + view.x <= 676);
    assert.ok((box.y + box.height) * view.scale + view.y <= 396);
  }
  assert.equal(getBlueprintFitView([bounds[0]], 700, 420).scale, 1);
  assert.equal(getBlueprintFitView(bounds, 280, 380).scale, 0.2);
  assert.equal(getBlueprintFitView([], 700, 420), null);
});

test('左键平移，右键不移动画布', () => {
  const env = setup();
  env.pointer('pointerdown', 1, 100, 100);
  env.pointer('pointermove', 1, 160, 130);
  env.pointer('pointerup', 1, 160, 130);
  assert.deepEqual(env.renderer.view, { x: 80, y: 90, scale: 1 });
  env.pointer('pointerdown', 2, 100, 100, { button: 2 });
  env.pointer('pointermove', 2, 200, 200, { button: 2 });
  env.pointer('pointerup', 2, 200, 200, { button: 2 });
  assert.deepEqual(env.renderer.view, { x: 80, y: 90, scale: 1 });
  assert.equal(env.layer.captured.size, 0);
  env.detach();
});

test('直接滚轮缩放保持鼠标下的图坐标，限制在 20% 至 300%', () => {
  const env = setup();
  assert.equal(env.wheel(-120).prevented, true);
  assert.ok(env.renderer.view.scale > 1);
  const anchored = () => {
    const { x, y, scale } = env.renderer.view;
    close((260 - x) / scale, 240);
    close((180 - y) / scale, 120);
  };
  anchored();
  for (let i = 0; i < 10; i++) env.wheel(-10000);
  assert.equal(env.renderer.view.scale, 3);
  anchored();
  for (let i = 0; i < 10; i++) env.wheel(10000, { deltaMode: 1 });
  assert.equal(env.renderer.view.scale, 0.2);
  anchored();
  env.detach();
});

test('双指捏合保持中心，抬起一指后继续平移无跳位', () => {
  const env = setup();
  env.pointer('pointerdown', 1, 100, 200, { pointerType: 'touch' });
  env.pointer('pointerdown', 2, 300, 200, { pointerType: 'touch' });
  env.pointer('pointermove', 1, 50, 200);
  env.pointer('pointermove', 2, 350, 200);
  const before = env.renderer.view;
  close(before.scale, 1.5);
  close((160 - before.x) / before.scale, 140);
  close((130 - before.y) / before.scale, 70);
  env.pointer('pointerup', 2, 350, 200);
  assert.deepEqual(env.renderer.view, before);
  env.pointer('pointermove', 1, 70, 230);
  close(env.renderer.view.x, before.x + 20);
  close(env.renderer.view.y, before.y + 30);
  close(env.renderer.view.scale, before.scale);
  env.detach();
});

test('取消、失焦和卸载释放拖动，卸载后旧事件与待绘制帧失效', () => {
  const env = setup();
  env.pointer('pointerdown', 1, 100, 100);
  env.pointer('pointercancel', 1, 100, 100);
  env.pointer('pointermove', 1, 200, 200);
  assert.deepEqual(env.renderer.view, { x: 20, y: 60, scale: 1 });
  env.pointer('pointerdown', 2, 100, 100);
  window.emit('blur');
  assert.equal(env.layer.captured.size, 0);
  env.pointer('pointermove', 2, 200, 200);
  assert.deepEqual(env.renderer.view, { x: 20, y: 60, scale: 1 });
  env.layer.emit('wheel', { deltaY: -100, clientX: 300, clientY: 250 });
  env.detach();
  env.flush();
  env.wheel(-100);
  assert.deepEqual(env.renderer.view, { x: 20, y: 60, scale: 1 });
});

test('重置恢复初始视图，渲染器切换子图后采用新的重置位置', () => {
  const env = setup();
  env.wheel(-120);
  env.pointer('pointerdown', 1, 100, 100);
  env.pointer('pointermove', 1, 160, 130);
  env.pointer('pointerup', 1, 160, 130);
  env.reset.emit('click');
  assert.deepEqual(env.renderer.view, { x: 20, y: 60, scale: 1 });
  env.renderer.moveTo(80, 90, 1);
  env.wheel(-120);
  env.reset.emit('keydown', { key: 'Enter' });
  assert.deepEqual(env.renderer.view, { x: 80, y: 90, scale: 1 });
  env.detach();
});
