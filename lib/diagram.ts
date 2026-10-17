/** 图种由文本声明决定，创作时不用再维护一份重复的图表类型字段。 */
export function getDiagramKind(source: string): string {
  const declaration =
    source
      .split('\n')
      .find((line) => line.trim() && !line.trim().startsWith('%%'))
      ?.trim() ?? '';
  if (/^(flowchart|graph)\b/.test(declaration)) return '关系 / 流程';
  if (/^sequenceDiagram\b/.test(declaration)) return '时序';
  if (/^stateDiagram(?:-v2)?\b/.test(declaration)) return '状态';
  if (/^classDiagram\b/.test(declaration)) return '类型关系';
  if (/^erDiagram\b/.test(declaration)) return '数据关系';
  if (/^gantt\b/.test(declaration)) return '时间计划';
  if (/^timeline\b/.test(declaration)) return '时间线';
  return '图表';
}

export type DiagramSize = { width: number; height: number };
export type DiagramView = {
  viewport: { x: number; y: number; zoom: number };
  canvas: DiagramSize;
};

export const diagramZoom = { min: 0.05, max: 4 };

/** 默认保留可读字号；适应画布时完整显示图表，两种视图都留出操作边距。 */
export function getDiagramViewport(diagram: DiagramSize, canvas: DiagramSize, fit = false) {
  const padding = 24;
  const fitted = Math.min(
    1,
    Math.max(1, canvas.width - padding * 2) / diagram.width,
    Math.max(1, canvas.height - padding * 2) / diagram.height,
  );
  const zoom = fit ? fitted : Math.max(0.9, fitted);
  return {
    x: fit
      ? (canvas.width - diagram.width * zoom) / 2
      : Math.max(padding, (canvas.width - diagram.width * zoom) / 2),
    y: fit
      ? (canvas.height - diagram.height * zoom) / 2
      : Math.max(padding, (canvas.height - diagram.height * zoom) / 2),
    zoom,
  };
}
