import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { applyNodeChanges } = require('@xyflow/react');

// 只核对组件交给 React Flow 的数据与回调引用；实际绘制和手势在浏览器中验证。
function inspect(source) {
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
        cells[index] = { deps };
        pending.push(effect);
      }
    },
  };
  const updateMotion = () => {};
  const xyflow = {
    ReactFlow: () => null,
    BackgroundVariant: { Dots: 'dots' },
    useNodesState(initial) {
      const [nodes, setNodes] = react.useState(initial);
      const change = react.useCallback(
        (changes) => setNodes((current) => applyNodeChanges(changes, current)),
        [],
      );
      return [nodes, setNodes, change];
    },
  };
  const exports = {};
  runInNewContext(
    ts.transpileModule(source + '\nexport { GraphCanvas };', {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (name === 'react') return react;
        if (name === 'react/jsx-runtime')
          return {
            jsx: (type, props) => ({ type, props }),
            jsxs: (type, props) => ({ type, props }),
          };
        if (name === '@xyflow/react') return xyflow;
        if (name === './use-graph-motion') return { useGraphMotion: () => updateMotion };
        if (name === '@/lib/graph') return require('../lib/graph.ts');
        if (name === '@/lib/graph-appearance') return require('../lib/graph-appearance.ts');
        return {};
      },
    },
  );
  const articles = ['a', 'b', 'c'].map((slug) => ({
    slug,
    title: slug,
    module: 'input',
    links: [],
  }));
  const props = {
    articles,
    relations: [{ id: 'a::b', source: 'a', target: 'b' }],
    activeSlug: 'a',
    center: null,
    layout: 'connections',
    compact: false,
    select() {},
    explore() {},
  };
  const render = () => {
    let result;
    do {
      dirty = false;
      cursor = 0;
      result = exports.GraphCanvas(props).props;
      const effects = pending;
      pending = [];
      effects.forEach((effect) => effect());
    } while (dirty);
    return result;
  };
  let previous = render();
  let nodeDataChanges = 0;
  let edgeArrayChanges = 0;
  let gestureHandlerChanges = 0;
  for (let frame = 0; frame < 60; frame++) {
    previous.onNodesChange([
      { id: 'a', type: 'position', position: { x: frame + 10, y: 20 }, dragging: true },
    ]);
    const current = render();
    nodeDataChanges += current.nodes.filter(
      (node, i) => node.data !== previous.nodes[i].data,
    ).length;
    edgeArrayChanges += Number(current.edges !== previous.edges);
    gestureHandlerChanges += Number(current.onNodesChange !== previous.onNodesChange);
    previous = current;
  }
  props.activeSlug = 'b';
  const selected = render();
  assert.equal(selected.nodes.find((node) => node.id === 'a').position.x, 69);
  assert.equal(selected.nodes.find((node) => node.id === 'b').data.focused, true);
  assert.equal(selected.nodes.find((node) => node.id === 'a').data.focused, false);
  return { nodeDataChanges, edgeArrayChanges, gestureHandlerChanges };
}

test('位置帧复用节点数据、连线与手势回调，切换选择保留拖动坐标', () => {
  const changes = inspect(
    readFileSync(new URL('../components/knowledge-graph.tsx', import.meta.url), 'utf8'),
  );
  assert.equal(changes.nodeDataChanges, 0);
  assert.equal(changes.edgeArrayChanges, 0);
  assert.equal(changes.gestureHandlerChanges, 0);
});
