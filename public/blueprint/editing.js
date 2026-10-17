import { getBlueprintWire, getStraightenedPositions, updateBlueprintPositions } from './layout.js';

function transformOf(element) {
  return new DOMMatrixReadOnly(element.style.transform);
}

/** 从已渲染的节点量取引脚，避免依赖 UE 和网页之间不同的标题、行高。 */
export function readBlueprintGeometry(root) {
  const canvas = root.querySelector('.canvas');
  const scale = transformOf(canvas).a;
  const pins = new Map();
  const nodes = [...canvas.querySelectorAll('.node')].map((element) => {
    const rect = element.getBoundingClientRect();
    const matrix = transformOf(element);
    const node = {
      id: element.getAttribute('data-id'),
      x: matrix.e,
      y: matrix.f,
      width: rect.width / scale,
      height: rect.height / scale,
    };
    for (const pin of element.querySelectorAll('.pin')) {
      const connector = pin.querySelector('.clink');
      if (!connector) continue;
      const box = connector.getBoundingClientRect();
      pins.set(pin.getAttribute('data-id'), {
        node: node.id,
        x:
          (box.left - rect.left) / scale +
          (connector.classList.contains('connector-image') ? 5 : 6),
        y: (box.top - rect.top) / scale + (connector.classList.contains('connector-image') ? 7 : 6),
        exec: connector.classList.contains('exec'),
        output: !!pin.closest('.right-col'),
      });
    }
    return node;
  });
  const links = [...canvas.querySelectorAll('svg.link')].flatMap((element) => {
    const ids = element.getAttribute('data-id').split(',');
    const first = pins.get(ids[0]);
    const second = pins.get(ids[1]);
    if (!first || !second) return [];
    const [from, to] = first.output ? [first, second] : [second, first];
    return [
      {
        element,
        from: from.node,
        to: to.node,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        exec: from.exec,
      },
    ];
  });
  return { nodes, links };
}

/** 只供编辑模式调用；平移、缩放仍由共享导航处理。 */
export function createBlueprintEditing(root, getText, onChange) {
  const canvas = root.querySelector('.canvas');
  const controller = new AbortController();
  let selected;
  root.classList.add('is-editing');
  for (const node of canvas.querySelectorAll('.node')) {
    node.tabIndex = 0;
    node.setAttribute(
      'aria-label',
      `调整节点：${node.querySelector('.name')?.textContent ?? '蓝图节点'}`,
    );
  }

  function select(node) {
    selected?.classList.remove('layout-selected');
    selected = node;
    selected.classList.add('layout-selected');
  }

  function redraw() {
    const geometry = readBlueprintGeometry(root);
    const byId = new Map(geometry.nodes.map((node) => [node.id, node]));
    for (const link of geometry.links) {
      const from = byId.get(link.from);
      const to = byId.get(link.to);
      const wire = getBlueprintWire(
        { x: from.x + link.fromX, y: from.y + link.fromY },
        { x: to.x + link.toX, y: to.y + link.toY },
      );
      link.element.style.transform = `translate(${wire.x}px, ${wire.y}px)`;
      link.element.setAttribute('width', wire.width);
      link.element.setAttribute('height', wire.height);
      link.element.querySelector('path').setAttribute('d', wire.path);
    }
  }

  function apply(positions) {
    for (const node of canvas.querySelectorAll('.node')) {
      const at = positions.get(node.getAttribute('data-id'));
      if (at) node.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
    }
    redraw();
  }

  function commit(positions) {
    const next = updateBlueprintPositions(getText(), positions);
    if (next !== getText()) onChange(next);
  }

  function start(event, view) {
    const node = event.target.closest('.node');
    if (!node) return;
    select(node);
    node.focus({ preventScroll: true });
    const id = node.getAttribute('data-id');
    const matrix = transformOf(node);
    const origin = { x: matrix.e, y: matrix.f };
    const geometry = readBlueprintGeometry(root);
    const neighbors = new Map(geometry.nodes.map((item) => [item.id, item]));
    const snapLines = geometry.links.flatMap((link) => {
      if (link.from === id) return [neighbors.get(link.to).y + link.toY - link.fromY];
      if (link.to === id) return [neighbors.get(link.from).y + link.fromY - link.toY];
      return [];
    });
    let current = origin;
    return {
      move(next) {
        let y = origin.y + (next.clientY - event.clientY) / view.scale;
        const nearest = [...snapLines].sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0];
        if (nearest !== undefined && Math.abs(nearest - y) * view.scale <= 6) y = nearest;
        current = {
          x: Math.round(origin.x + (next.clientX - event.clientX) / view.scale),
          y: Math.round(y),
        };
        apply(new Map([[id, current]]));
      },
      commit() {
        commit(new Map([[id, current]]));
      },
      cancel() {
        apply(new Map([[id, origin]]));
      },
    };
  }

  canvas.addEventListener(
    'keydown',
    (event) => {
      if (!event.target.matches('.node')) return;
      const direction = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      select(event.target);
      const matrix = transformOf(selected);
      const step = event.shiftKey ? 16 : 1;
      const positions = new Map([
        [
          selected.getAttribute('data-id'),
          { x: matrix.e + direction[0] * step, y: matrix.f + direction[1] * step },
        ],
      ]);
      apply(positions);
      commit(positions);
    },
    { signal: controller.signal },
  );

  return {
    start,
    straighten() {
      const { nodes, links } = readBlueprintGeometry(root);
      const positions = getStraightenedPositions(nodes, links);
      apply(positions);
      commit(positions);
    },
    dispose() {
      controller.abort();
      selected?.classList.remove('layout-selected');
      root.classList.remove('is-editing');
    },
  };
}
