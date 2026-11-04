/**
 * 时序图逐步播放：Mermaid 12 为每条消息输出 `text.messageText` 与随后的
 * `messageLine0／messageLine1`（自调用为 path），注释为 `rect.note` 与 `text.noteText`。
 * 注释在文档中排在全部消息之前，所以先按“起始元素 + 后续元素”分组，再按纵向位置排出图中的先后顺序；
 * 随后为当前步之前、当前、之后的元素写入状态属性，样式由全站 CSS 决定。
 */

const STEP_SELECTOR = '.messageText, .messageLine0, .messageLine1, .note, .noteText';

function top(element: Element) {
  return Number.parseFloat(element.getAttribute('y') ?? element.getAttribute('y1') ?? '0') || 0;
}

function collectSteps(root: ParentNode) {
  const steps: Element[][] = [];
  for (const element of root.querySelectorAll(STEP_SELECTOR)) {
    const starts = element.classList.contains('messageText') || element.classList.contains('note');
    if (starts || !steps.length) steps.push([element]);
    else steps[steps.length - 1].push(element);
  }
  // 时序图自上而下推进，同一步内起始元素的纵坐标即该步在图中的位置。
  return steps.sort((a, b) => top(a[0]) - top(b[0]));
}

/** 返回每一步的说明文字；没有可播放的消息时为空数组。 */
export function getSequenceSteps(svg: string) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return collectSteps(document).map((elements) =>
    elements
      .map((element) => element.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' '),
  );
}

/** step 从 1 开始；传入 null 时原样返回，表示显示全部。 */
export function applySequenceStep(svg: string, step: number | null) {
  if (step === null) return svg;
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  collectSteps(document).forEach((elements, index) => {
    const state = index + 1 < step ? 'past' : index + 1 === step ? 'current' : 'future';
    for (const element of elements) element.setAttribute('data-step-state', state);
  });
  return new XMLSerializer().serializeToString(document.documentElement);
}
