import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../components/particle-effects.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source + '\nexport { useParticleCanvas };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// 驱动真实输入监听和 RAF；替换绘制以隔离事件频率，不模拟 Canvas 的视觉结果。
async function setup(enabled = true) {
  let now = 0;
  let frameId = 0;
  let visibility;
  const frames = new Map();
  const effects = [];
  const samples = [];
  const scope = new EventTarget();
  const canvas = {
    dataset: {},
    getContext: () => ({ setTransform() {} }),
    getBoundingClientRect: () => ({ left: 40, top: 80, width: 800, height: 600 }),
  };
  const scene = {
    resize() {},
    draw(_time, _delta, pointer, animated) {
      samples.push({ ...pointer, animated });
      return pointer.speed > 25;
    },
  };
  const preference = new EventTarget();
  preference.matches = false;
  const win = new EventTarget();
  win.matchMedia = () => preference;
  const doc = new EventTarget();
  doc.documentElement = scope;
  doc.hidden = false;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'react') {
        return {
          createContext: () => ({}),
          useContext: () => ({ enabled }),
          useRef: (value) => ({ current: value === null ? canvas : value }),
          useEffect: (effect) => effects.push(effect),
        };
      }
      if (name === '@/lib/site-config') return { assetUrl: (value) => value };
      if (name === '@/lib/particles') return { createPortraitScene: async () => scene };
      if (name === 'react/jsx-runtime' || name === 'lucide-react') return {};
      return require(name);
    },
    window: win,
    document: doc,
    performance: { now: () => now },
    requestAnimationFrame: (callback) => (frames.set(++frameId, callback), frameId),
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback) {
        visibility = callback;
      }
      observe() {
        visibility([{ isIntersecting: true }]);
      }
      disconnect() {}
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    clearTimeout,
    setTimeout,
  });
  exports.useParticleCanvas('portrait');
  const cleanups = effects.map((effect) => effect());
  await Promise.resolve();

  return {
    canvas,
    samples,
    frames,
    win,
    doc,
    preference,
    visible: (value) => visibility([{ isIntersecting: value }]),
    move(x, time = now, pointerType = 'mouse', type = 'pointermove') {
      now = time;
      const event = new Event(type);
      Object.assign(event, { clientX: x + 40, clientY: 280, pointerType });
      scope.dispatchEvent(event);
    },
    frame(time) {
      now = time;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    },
    dispose: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

function sweep(input, rate, duplicate = false, start = 0, speed = 1000) {
  const step = 1000 / 60;
  input.move(200, start);
  input.frame(start);
  for (let i = 1; i <= 30; i++) {
    const count = rate / 60;
    for (let j = 1; j <= count; j++) {
      const time = (i - 1 + j / count) * step;
      input.move(200 + (time * speed) / 1000, start + time);
    }
    if (duplicate) input.move(200 + (i * step * speed) / 1000, start + i * step);
    input.frame(start + i * step);
  }
  return input.samples.at(-1).speed;
}

test('同速移动在不同事件频率下保持一致，同帧的同坐标事件不抹掉扰动', async (t) => {
  for (const rate of [60, 120, 960]) {
    for (const duplicate of [false, true]) {
      const input = await setup();
      t.after(input.dispose);
      assert.ok(Math.abs(sweep(input, rate, duplicate) - 1000) < 1e-6);
      assert.equal(input.canvas.dataset.motion, 'running');
      assert.equal(input.samples.at(-1).x, 700, '速度与坐标使用相同的 CSS 像素单位');
    }
  }
});

test('快划与慢划仍有区别，停帧后再次移动能立即唤醒，重复多轮不失灵', async (t) => {
  const input = await setup();
  t.after(input.dispose);
  for (let cycle = 0; cycle < 12; cycle++) {
    const start = cycle * 3000;
    const speed = cycle % 2 ? 80 : 1000;
    assert.ok(Math.abs(sweep(input, 960, true, start, speed) - speed) < 1e-6);
    for (let time = 520; input.frames.size && time < 2500; time += 20) {
      input.frame(start + time);
    }
    assert.equal(input.canvas.dataset.motion, 'idle');
    assert.equal(input.frames.size, 0, '静止后释放 RAF，下一轮输入重新唤醒');
  }
});

test('触摸点按保留短暂脉冲，触摸滑动不当作鼠标速度', async (t) => {
  const input = await setup();
  t.after(input.dispose);
  input.move(200, 0, 'touch', 'pointerdown');
  input.frame(0);
  const tap = input.samples.at(-1);
  assert.ok(tap.speed > 500 && tap.speed <= 600);
  input.move(500, 8, 'touch');
  input.frame(20);
  assert.equal(input.samples.at(-1).x, 200);
  assert.ok(input.samples.at(-1).speed < tap.speed);
});

test('后台与离屏暂停 RAF，恢复可见后继续接收输入，卸载清理监听', async () => {
  const input = await setup();
  try {
    sweep(input, 120);
    input.doc.hidden = true;
    input.doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(input.frames.size, 0);
    assert.equal(input.canvas.dataset.motion, 'suspended');
    input.doc.hidden = false;
    input.doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(input.frames.size, 1);
    input.visible(false);
    assert.equal(input.frames.size, 0);
    input.visible(true);
    assert.ok(Math.abs(sweep(input, 960, true, 1000) - 1000) < 1e-6);
  } finally {
    input.dispose();
  }
  input.move(400, 2000);
  input.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(input.frames.size, 0);
});

test('暂停开关与减少动态效果都停止后续帧', async (t) => {
  const paused = await setup(false);
  t.after(paused.dispose);
  paused.frame(0);
  paused.move(400, 20);
  assert.equal(paused.canvas.dataset.motion, 'paused');
  assert.equal(paused.frames.size, 0);
  const input = await setup();
  t.after(input.dispose);
  sweep(input, 120);
  input.preference.matches = true;
  input.preference.dispatchEvent(new Event('change'));
  input.frame(520);
  assert.equal(input.samples.at(-1).animated, false);
  assert.equal(input.canvas.dataset.motion, 'paused');
  assert.equal(input.frames.size, 0);
});
