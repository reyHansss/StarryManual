export const GRAPH_MIN_ZOOM = 0.08;
export const GRAPH_MAX_ZOOM = 4;

/** 圆点面积随连接数增长，让枢纽有明显层级；上限避免极大节点遮住邻居。 */
export function getGraphNodeMetrics(degree: number, zoom: number, module = false) {
  const diameter = Math.min(
    module ? 96 : 80,
    (module ? 22 : 14) * Math.sqrt(1 + Math.max(0, degree) * (module ? 1 : 1.5)),
  );
  // 只补偿圆点的视觉尺寸。屏幕直径随 zoom^0.55 变化，位置与连线仍跟随画布。
  const scale = Math.pow(zoom, -0.45);
  return { diameter, scale, visualDiameter: diameter * scale };
}
