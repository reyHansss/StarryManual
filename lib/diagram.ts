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
