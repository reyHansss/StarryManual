const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const CONTROLS =
  'a, button, input, textarea, select, [contenteditable="true"], .more, .less, .checkbox';

/** 从节点实际边界自动取景，普通笔记不另外填写画布坐标或初始缩放。 */
export function getBlueprintFitView(bounds, width, height, padding = 24) {
  if (!bounds.length || width <= padding * 2 || height <= padding * 2) return null;
  const left = Math.min(...bounds.map((box) => box.x));
  const top = Math.min(...bounds.map((box) => box.y));
  const right = Math.max(...bounds.map((box) => box.x + box.width));
  const bottom = Math.max(...bounds.map((box) => box.y + box.height));
  const scale = Math.max(
    MIN_SCALE,
    Math.min(
      1,
      (width - padding * 2) / Math.max(1, right - left),
      (height - padding * 2) / Math.max(1, bottom - top),
    ),
  );
  return {
    x: (width - (right - left) * scale) / 2 - left * scale,
    y: (height - (bottom - top) * scale) / 2 - top * scale,
    scale,
  };
}

/** 为只读蓝图接入网页手势，返回清理函数，供节点重载时解除监听。 */
export function attachBlueprintNavigation(
  renderer,
  root,
  { fitButton, actualSizeButton, nodeEditing } = {},
) {
  const layer = root.querySelector('.layer');
  const canvas = root.querySelector('.canvas');
  const zoom = root.querySelector('.frame-header__current-zoom');
  const reset = root.querySelector('.frame-header__buttons-reset');
  const controller = new AbortController();
  const pointers = new Map();
  let animation;
  let dragStart;
  let nodeDrag;
  let suppressClick = false;
  let lastTransform = canvas.style.transform;
  let view = readView();
  let initialView = { ...view };

  function readView() {
    const matrix = new DOMMatrixReadOnly(canvas.style.transform);
    return { x: matrix.e, y: matrix.f, scale: matrix.a };
  }

  function syncView() {
    // 子图导航也会改变视图；只有渲染器主动改变位置时才更新重置基准。
    if (!animation && canvas.style.transform !== lastTransform) {
      view = readView();
      initialView = { ...view };
      lastTransform = canvas.style.transform;
    }
  }

  function draw() {
    animation = undefined;
    // 使用公开接口同步渲染器状态，节点展开重绘连线时仍保持当前视图。
    renderer.moveTo(view.x, view.y, view.scale);
    lastTransform = canvas.style.transform;
    zoom.textContent = `${Math.round(view.scale * 100)}%`;
  }

  function scheduleDraw() {
    animation ??= requestAnimationFrame(draw);
  }

  function zoomAt(scale, from, to = from) {
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    const ratio = nextScale / view.scale;
    const rect = layer.getBoundingClientRect();
    view = {
      x: to.x - rect.left - (from.x - rect.left - view.x) * ratio,
      y: to.y - rect.top - (from.y - rect.top - view.y) * ratio,
      scale: nextScale,
    };
    scheduleDraw();
  }

  function fitView() {
    syncView();
    const layerRect = layer.getBoundingClientRect();
    const bounds = [...root.querySelectorAll('.node')].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: (rect.left - layerRect.left - view.x) / view.scale,
        y: (rect.top - layerRect.top - view.y) / view.scale,
        width: rect.width / view.scale,
        height: rect.height / view.scale,
      };
    });
    const fitted = getBlueprintFitView(bounds, layer.clientWidth, layer.clientHeight);
    if (!fitted) return;
    clearPointers();
    if (animation) cancelAnimationFrame(animation);
    view = fitted;
    initialView = { ...fitted };
    draw();
  }

  function gesture() {
    const [first, second] = pointers.values();
    if (!second) return { center: first, distance: 0 };
    return {
      center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      distance: Math.hypot(first.x - second.x, first.y - second.y),
    };
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    if (pointers.size === 0) {
      suppressClick = false;
      if (event.target.closest(CONTROLS)) return;
      syncView();
      dragStart = { x: event.clientX, y: event.clientY };
      nodeDrag = nodeEditing?.start(event, view);
    }
    if (pointers.size >= 2) return;
    if (pointers.size === 1 && nodeDrag) {
      nodeDrag.commit();
      nodeDrag = undefined;
    }
    event.preventDefault();
    layer.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    layer.classList.add('is-panning');
    if (pointers.size === 2) suppressClick = true;
  }

  function pointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    const previous = gesture();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = gesture();
    if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4)
      suppressClick = true;
    if (nodeDrag) {
      nodeDrag.move(event);
      return;
    }
    // 同时使用双指中心和距离，缩放时可继续平移，抬起一指后自然转为单指拖动。
    const ratio = previous.distance > 0 ? next.distance / previous.distance : 1;
    zoomAt(view.scale * ratio, previous.center, next.center);
  }

  function pointerUp(event) {
    if (!pointers.has(event.pointerId)) return;
    const finishedDrag = nodeDrag;
    nodeDrag = undefined;
    if (event.type === 'pointercancel') finishedDrag?.cancel();
    else finishedDrag?.commit();
    pointers.delete(event.pointerId);
    if (layer.hasPointerCapture(event.pointerId)) layer.releasePointerCapture(event.pointerId);
    layer.classList.toggle('is-panning', pointers.size > 0);
  }

  function clearPointers() {
    nodeDrag?.cancel();
    nodeDrag = undefined;
    for (const id of pointers.keys()) {
      if (layer.hasPointerCapture(id)) layer.releasePointerCapture(id);
    }
    pointers.clear();
    layer.classList.remove('is-panning');
  }

  function wheel(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pointers.size > 0 || event.deltaY === 0) return;
    syncView();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? layer.clientHeight : 1;
    const delta = Math.max(-500, Math.min(500, event.deltaY * unit));
    zoomAt(view.scale * Math.exp(-delta * 0.0015), { x: event.clientX, y: event.clientY });
  }

  const on = (target, type, listener, options = {}) =>
    target.addEventListener(type, listener, { ...options, signal: controller.signal });

  on(layer, 'pointerdown', pointerDown);
  on(layer, 'pointermove', pointerMove);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    on(layer, type, pointerUp);
  on(window, 'blur', clearPointers);
  on(layer, 'wheel', wheel, { capture: true, passive: false });
  // 接管画布导航，保留参数编辑与展开控件的鼠标操作，避免旧拖动逻辑重复处理。
  on(
    layer,
    'mousedown',
    (event) => {
      if (event.button !== 0 || !event.target.closest(CONTROLS)) event.stopImmediatePropagation();
    },
    { capture: true },
  );
  on(layer, 'touchstart', (event) => event.stopImmediatePropagation(), { capture: true });
  on(layer, 'contextmenu', (event) => event.stopImmediatePropagation(), { capture: true });
  for (const type of ['click', 'dblclick']) {
    on(
      layer,
      type,
      (event) => {
        if (suppressClick && event.detail > 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }
  reset.setAttribute('role', 'button');
  reset.setAttribute('tabindex', '0');
  reset.setAttribute('aria-label', '重置蓝图视图');
  reset.textContent = '重置视图';
  function resetView(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    syncView();
    clearPointers();
    if (animation) cancelAnimationFrame(animation);
    view = { ...initialView };
    draw();
  }
  on(reset, 'click', resetView, { capture: true });
  on(reset, 'keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') resetView(event);
  });
  if (fitButton) on(fitButton, 'click', fitView);
  if (actualSizeButton) {
    on(actualSizeButton, 'click', () => {
      syncView();
      const rect = layer.getBoundingClientRect();
      zoomAt(1, { x: rect.left + layer.clientWidth / 2, y: rect.top + layer.clientHeight / 2 });
    });
  }
  fitView();
  zoom.textContent = `${Math.round(view.scale * 100)}%`;

  return () => {
    controller.abort();
    clearPointers();
    if (animation) cancelAnimationFrame(animation);
  };
}
