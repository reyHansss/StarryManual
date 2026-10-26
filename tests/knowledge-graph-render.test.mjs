import assert from 'node:assert/strict';
import test from 'node:test';
import { getEventListeners } from 'node:events';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { applyNodeChanges } = require('@xyflow/react');
const { articleModules } = require('../lib/navigation.ts');
const compiled = ts.transpileModule(
  readFileSync(new URL('../components/knowledge-graph.tsx', import.meta.url), 'utf8') +
    '\nexport { GraphCanvas, GraphExplorer, ArticlePoint };',
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

class ElementStub {
  constructor(id, focusVisible = false) {
    this.dataset = { id };
    this.focusVisible = focusVisible;
  }
  closest() {
    return this.dataset.id ? this : null;
  }
  matches(selector) {
    return selector === ':focus-visible' ? this.focusVisible : Boolean(this.dataset.id);
  }
}

// 隔离 React 调度与 DOM 命中，核对组件实际交给 React Flow 的状态；真实手势另在浏览器复查。
function inspect(overrides = {}) {
  const cells = [];
  let cursor = 0;
  let pending = [];
  let dirty = false;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const useMemo = (create, deps) => {
    const index = cursor++;
    if (!cells[index] || !same(cells[index].deps, deps)) cells[index] = { value: create(), deps };
    return cells[index].value;
  };
  const react = {
    memo: require('react').memo,
    useMemo,
    useCallback: (callback, deps) => useMemo(() => callback, deps),
    useState(initial) {
      const index = cursor++;
      if (!cells[index]) {
        cells[index] = {
          value: typeof initial === 'function' ? initial() : initial,
          set: (next) => {
            cells[index].value = typeof next === 'function' ? next(cells[index].value) : next;
            dirty = true;
          },
        };
      }
      return [cells[index].value, cells[index].set];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!cells[index] || !same(cells[index].deps, deps)) {
        cells[index]?.cleanup?.();
        cells[index] = { deps };
        pending.push(() => (cells[index].cleanup = effect()));
      }
    },
  };
  const updateMotion = () => {};
  const xyflow = {
    ReactFlow: () => null,
    Handle: () => null,
    BackgroundVariant: { Dots: 'dots' },
    Position: { Left: 'left', Right: 'right' },
    useStore: (selector) => selector({ transform: [0, 0, props.zoom ?? 1] }),
    useNodesState(initial) {
      const [nodes, setNodes] = react.useState(initial);
      const change = react.useCallback(
        (changes) => setNodes((current) => applyNodeChanges(changes, current)),
        [],
      );
      return [nodes, setNodes, change];
    },
  };
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    hit: null,
    elementFromPoint: () => document.hit,
  });
  const exports = {};
  runInNewContext(compiled, {
    exports,
    window,
    document,
    Element: ElementStub,
    require: (name) => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime')
        return {
          jsx: (type, props, key) => ({ type, props, key }),
          jsxs: (type, props, key) => ({ type, props, key }),
        };
      if (name === '@xyflow/react') return xyflow;
      if (name === './use-graph-motion') return { useGraphMotion: () => updateMotion };
      if (name === '@/lib/graph') return require('../lib/graph.ts');
      if (name === '@/lib/navigation') return require('../lib/navigation.ts');
      if (name === '@/lib/graph-appearance') return require('../lib/graph-appearance.ts');
      return {};
    },
  });
  const selections = [];
  const props = {
    articles: ['a', 'b', 'c', 'd'].map((slug, order) => ({
      slug,
      title: slug,
      description: `${slug} 的说明`,
      module: 'input',
      order,
      url: `/docs/${slug}`,
      links: slug === 'a' ? ['b', 'c'] : slug === 'b' ? ['c'] : [],
    })),
    relations: ['a::b', 'a::c', 'b::c'].map((id) => {
      const [source, target] = id.split('::');
      return { id, source, target };
    }),
    activeSlug: 'a',
    center: null,
    layout: 'connections',
    compact: false,
    select: (slug) => selections.push(slug),
    ...overrides,
  };
  const render = (name = 'GraphCanvas', input = props) => {
    let result;
    let passes = 0;
    do {
      assert.ok(passes++ < 20, '组件状态应在有限次渲染内稳定');
      dirty = false;
      cursor = 0;
      result = exports[name](input);
      const effects = pending;
      pending = [];
      effects.forEach((effect) => effect());
    } while (dirty);
    return result;
  };
  return {
    props,
    selections,
    window,
    document,
    render,
    flow: () => render().props,
    unmount: () => cells.forEach((cell) => cell.cleanup?.()),
  };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
}
const node = (flow, id) => flow.nodes.find((item) => item.id === id);
const emphasis = (flow) => flow.nodes.find((item) => item.className === 'graph-node-active')?.id;
const enter = (flow, id, pointerType = 'mouse') =>
  flow.onPointerOver({ target: new ElementStub(id), relatedTarget: null, pointerType });

test('位置帧复用节点数据、连线与手势回调，点击详情不固定强调或重置位置', () => {
  const scene = inspect();
  let previous = scene.flow();
  enter(previous, 'a');
  previous = scene.flow();
  for (let frame = 0; frame < 60; frame++) {
    previous.onNodesChange([
      { id: 'a', type: 'position', position: { x: frame + 10, y: 20 }, dragging: true },
    ]);
    const current = scene.flow();
    current.nodes.forEach((item, i) => assert.equal(item.data, previous.nodes[i].data));
    assert.equal(current.edges, previous.edges);
    assert.equal(current.onNodesChange, previous.onNodesChange);
    previous = current;
  }
  previous.onNodeClick(null, node(previous, 'b'));
  scene.props.activeSlug = 'b';
  previous.onPointerLeave();
  const selected = scene.flow();
  assert.equal(scene.selections.at(-1), 'b');
  assert.equal(node(selected, 'a').position.x, 69);
  assert.equal(emphasis(selected), undefined);
  assert.ok(selected.nodes.every((item) => !item.data.focused));
});

test('悬停只强调一跳节点与直接连线，节点内部移动不重建数据，离开恢复全图', () => {
  const scene = inspect();
  const idle = scene.flow();
  assert.equal(emphasis(idle), undefined);
  enter(idle, 'a');
  const active = scene.flow();
  assert.equal(emphasis(active), 'a');
  assert.equal(node(active, 'b').className, 'graph-node-neighbor');
  assert.equal(node(active, 'c').className, 'graph-node-neighbor');
  assert.equal(node(active, 'd').className, 'graph-node-muted');
  active.nodes.forEach((item, i) => assert.equal(item.data, idle.nodes[i].data));
  assert.equal(active.edges[0].style.stroke, articleModules.input.nodeColor);
  assert.equal(active.edges[0].style.opacity, 0.9);
  assert.equal(active.edges[2].style.opacity, 0.07);
  active.onPointerOut({
    target: new ElementStub('a'),
    relatedTarget: new ElementStub('a'),
    pointerType: 'mouse',
  });
  assert.equal(scene.flow().edges, active.edges);
  active.onPointerOut({ target: new ElementStub('a'), relatedTarget: null, pointerType: 'mouse' });
  const restored = scene.flow();
  assert.ok(restored.nodes.every((item) => item.className === undefined));
  assert.ok(restored.edges.every((edge) => edge.style.opacity === 0.35));
});

test('拖动锁定强调，松手按实际命中恢复悬停，触摸结束清除且不打开详情', () => {
  const scene = inspect();
  let flow = scene.flow();
  flow.onNodeDragStart({}, node(flow, 'a'));
  flow = scene.flow();
  enter(flow, 'd');
  flow.onPointerLeave();
  assert.equal(emphasis(scene.flow()), 'a');
  scene.document.hit = new ElementStub('b');
  flow.onNodeDragStop({ clientX: 20, clientY: 30 });
  assert.equal(emphasis(scene.flow()), 'b');
  flow.onNodeDragStart({}, node(flow, 'a'));
  flow = scene.flow();
  scene.document.hit = null;
  flow.onNodeDragStop({ clientX: -20, clientY: -30 });
  assert.equal(emphasis(scene.flow()), undefined);
  flow.onNodeDragStart({}, node(flow, 'c'));
  flow = scene.flow();
  scene.document.hit = new ElementStub('c');
  flow.onNodeDragStop({ changedTouches: [{ clientX: 20, clientY: 30 }] });
  assert.equal(emphasis(scene.flow()), undefined);
  assert.equal(scene.selections.length, 0);
});

test('键盘聚焦与触摸点按无常驻强调，取消、后台和失焦清除状态并释放监听', () => {
  const scene = inspect();
  let flow = scene.flow();
  enter(flow, 'a');
  flow.onFocusCapture({ target: new ElementStub('b', true) });
  assert.equal(emphasis(scene.flow()), 'b');
  flow.onBlurCapture();
  assert.equal(emphasis(scene.flow()), undefined);
  flow.onFocusCapture({ target: new ElementStub('a', false) });
  enter(flow, 'c', 'touch');
  assert.equal(emphasis(scene.flow()), undefined);
  enter(flow, 'c');
  flow.onPointerDownCapture({ pointerType: 'touch' });
  flow.onNodeClick(null, node(flow, 'd'));
  assert.equal(scene.selections.at(-1), 'd');
  assert.equal(emphasis(scene.flow()), undefined);
  for (const clear of [
    () => flow.onPointerCancel(),
    () => scene.window.dispatchEvent(new Event('blur')),
    () => {
      scene.document.hidden = true;
      scene.document.dispatchEvent(new Event('visibilitychange'));
    },
  ]) {
    flow.onNodeDragStart({}, node(flow, 'a'));
    flow = scene.flow();
    assert.equal(emphasis(flow), 'a');
    clear();
    flow = scene.flow();
    assert.equal(emphasis(flow), undefined);
  }
  scene.unmount();
  assert.equal(getEventListeners(scene.window, 'blur').length, 0);
  assert.equal(getEventListeners(scene.document, 'visibilitychange').length, 0);
});

test('详情初始显示范围概览，点击与清空独立于画布强调，切换局部图不继承旧详情', () => {
  const scene = inspect({
    view: { module: 'all', section: [], center: null, query: '', display: 'articles' },
  });
  const canvas = (tree) => find(tree, (item) => item.type?.name === 'GraphCanvas');
  const heading = (tree) => find(tree, (item) => item.type === 'h2').props.children;
  let tree = scene.render('GraphExplorer');
  assert.equal(heading(tree), '全部文章');
  assert.equal(canvas(tree).props.activeSlug, undefined);
  const key = canvas(tree).key;
  canvas(tree).props.select('b');
  tree = scene.render('GraphExplorer');
  assert.equal(heading(tree), 'b');
  assert.equal(canvas(tree).props.activeSlug, 'b');
  assert.equal(canvas(tree).key, key);
  canvas(tree).props.select();
  assert.equal(heading(scene.render('GraphExplorer')), '全部文章');
  canvas(tree).props.select('a');
  scene.props.view = { ...scene.props.view, center: 'a' };
  tree = scene.render('GraphExplorer');
  assert.equal(heading(tree), 'a的局部图');
  assert.equal(canvas(tree).props.activeSlug, undefined);
});

test('完整图只有圆点命中与拖动，标签仅显示并随画布缩放，紧凑卡片保留选择', () => {
  const scene = inspect();
  const flow = scene.flow();
  const point = inspect({ zoom: 0.5 });
  let tree = point.render('ArticlePoint', { data: node(flow, 'a').data });
  assert.equal(tree.props.style['--graph-label-size'], '12px');
  assert.ok(!tree.props.className.includes('focused'));
  const title = find(tree, (item) => item.props?.className === 'dot-title');
  assert.equal(title.type, 'span');
  assert.equal(title.props.onClick, undefined);
  assert.equal(title.props.tabIndex, undefined);
  assert.equal(node(flow, 'a').style.pointerEvents, 'none');
  assert.equal(node(flow, 'a').dragHandle, '.node-point');
  assert.equal(node(flow, 'a').ariaRole, 'button');
  assert.equal(find(tree, (item) => item.type?.name === 'Handle').props.isConnectable, false);
  point.props.zoom = 2;
  tree = point.render('ArticlePoint', { data: node(flow, 'a').data });
  assert.equal(tree.props.style['--graph-label-size'], '12px');
  tree = point.render('ArticlePoint', {
    data: { ...node(flow, 'a').data, article: { ...scene.props.articles[0], kind: 'module' } },
  });
  assert.equal(tree.props.style['--graph-label-size'], '13px');
  const compact = inspect({ compact: true });
  let preview = compact.flow();
  assert.equal(node(preview, 'a').data.focused, true);
  assert.equal(node(preview, 'a').dragHandle, undefined);
  assert.equal(node(preview, 'a').style, undefined);
  compact.props.activeSlug = 'b';
  preview = compact.flow();
  assert.equal(node(preview, 'b').data.focused, true);
  assert.equal(node(preview, 'a').data.focused, false);
  assert.equal(getEventListeners(compact.window, 'blur').length, 0);
});

test('移除文字按钮后节点仍支持键盘打开详情，不拦截原生方向键', () => {
  const scene = inspect();
  const flow = scene.flow();
  let prevented = 0;
  for (const key of ['Enter', ' ']) {
    flow.onKeyDown({
      target: new ElementStub('b'),
      key,
      preventDefault: () => prevented++,
    });
  }
  flow.onKeyDown({ target: new ElementStub('b'), key: 'ArrowLeft' });
  flow.onKeyDown({ target: new ElementStub(), key: 'Enter' });
  assert.deepEqual(scene.selections, ['b', 'b']);
  assert.equal(prevented, 2);
});
