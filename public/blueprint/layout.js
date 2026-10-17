/** 只回写对象自身的位置，保留类型、引脚、连接和嵌套对象的原始文本。 */
export function updateBlueprintPositions(text, positions) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const blocks = [];
  const insertions = new Map();
  let changed = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*Begin Object\b/.test(line)) {
      blocks.push({});
      continue;
    }
    const block = blocks.at(-1);
    if (!block) continue;
    const guid = line.match(/^\s*NodeGuid=([A-Fa-f0-9]+)\s*$/);
    if (guid) {
      block.guid = guid[1];
      block.guidLine = index;
      block.indent = line.match(/^\s*/)[0];
    }
    for (const axis of ['X', 'Y']) {
      if (new RegExp(`^\\s*NodePos${axis}=`).test(line)) block[axis] = index;
    }
    if (!/^\s*End Object\b/.test(line)) continue;
    blocks.pop();
    const point = positions.get(block.guid);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const missing = [];
    for (const axis of ['X', 'Y']) {
      const value = Math.round(point[axis.toLowerCase()]);
      const at = block[axis];
      if (at === undefined) {
        if (value !== 0) missing.push(`${block.indent ?? '   '}NodePos${axis}=${value}`);
      } else {
        const next = lines[at].replace(/(NodePos[XY]=)[-\d.]+/, `$1${value}`);
        if (next !== lines[at]) changed = true;
        lines[at] = next;
      }
    }
    if (missing.length) {
      insertions.set(block.guidLine ?? index, missing);
      changed = true;
    }
  }
  if (!changed) return text;
  return lines.flatMap((line, index) => [...(insertions.get(index) ?? []), line]).join(newline);
}

/** 以执行线为先对齐实际引脚；同一回路无法全部拉直时保留必要弯线。 */
export function getStraightenedPositions(nodes, links) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  const hasExec = new Set();
  const sorted = [...links].sort((a, b) => Number(b.exec) - Number(a.exec));
  for (const link of sorted) {
    if (!byId.has(link.from) || !byId.has(link.to) || link.from === link.to) continue;
    if (link.exec) {
      hasExec.add(link.from);
      hasExec.add(link.to);
    }
    adjacency.get(link.from).push({ id: link.to, delta: link.fromY - link.toY });
    adjacency.get(link.to).push({ id: link.from, delta: link.toY - link.fromY });
  }
  const positions = new Map();
  const roots = [...nodes].sort(
    (a, b) => Number(hasExec.has(b.id)) - Number(hasExec.has(a.id)) || a.x - b.x,
  );
  for (const root of roots) {
    if (positions.has(root.id)) continue;
    positions.set(root.id, { x: root.x, y: root.y });
    const queue = [root.id];
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      for (const edge of adjacency.get(id)) {
        if (positions.has(edge.id)) continue;
        const node = byId.get(edge.id);
        positions.set(edge.id, { x: node.x, y: positions.get(id).y + edge.delta });
        queue.push(edge.id);
      }
    }
  }
  // 执行节点保持主线，纯数据节点必要时下移，避免把节点压到一起。
  const placed = [];
  for (const node of roots) {
    const point = positions.get(node.id);
    let nextY = point.y;
    for (let pass = 0; pass < placed.length + 1; pass++) {
      const collision = placed.find((other) => {
        const at = positions.get(other.id);
        return (
          point.x < at.x + other.width + 12 &&
          point.x + node.width + 12 > at.x &&
          nextY < at.y + other.height + 12 &&
          nextY + node.height + 12 > at.y
        );
      });
      if (!collision) break;
      const at = positions.get(collision.id);
      nextY = at.y + collision.height + 12;
    }
    point.y = Math.round(nextY);
    placed.push(node);
  }
  return positions;
}

/** 所有路径都从真实引脚出发；同高时为直线，换行与回接保留 UE 式曲线。 */
export function getBlueprintWire(from, to) {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const start = { x: from.x - x, y: from.y - y };
  const end = { x: to.x - x, y: to.y - y };
  const tangent = Math.max(48, Math.abs(to.x - from.x) / 2);
  return {
    x,
    y,
    width: Math.max(2, Math.abs(to.x - from.x)),
    height: Math.max(2, Math.abs(to.y - from.y)),
    path:
      to.x >= from.x && Math.abs(to.y - from.y) < 0.5
        ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
        : `M ${start.x} ${start.y} C ${start.x + tangent} ${start.y}, ${end.x - tangent} ${end.y}, ${end.x} ${end.y}`,
  };
}
