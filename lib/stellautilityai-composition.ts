/**
 * StellaUtilityAI Modifier 叠加规则的网页演示版本，逐条对应插件中的 `FStellaUtilityAIComposition::Build`
 * （`Plugins/AI/StellaUtilityAI/Source/StellaUtilityAI/Private/Behavior/StellaUtilityAIBehaviorModifierStack.cpp`）。
 * 只计算组合结果，不模拟评分、执行或 Modifier 事件；源码规则变化时同步修改这里和对应测试。
 */

export type ModifierOperation = 'AddGroup' | 'AddBehavior' | 'RemoveGroup' | 'RemoveBehavior';
export type StellaPriority = 'Critical' | 'Normal';

/** 组路径加本地名称；名称比较与 FName 一致，不区分大小写。 */
export type BehaviorPath = { groups: string[]; name: string };

export type ModifierEntry = {
  operation: ModifierOperation;
  path: BehaviorPath;
  /** 只有根添加项读取；子项继承父组优先级。源码默认 Normal。 */
  rootPriority: StellaPriority;
  /** 演示用的模板显示名，对应条目里实例化的 Group 或 Behavior。 */
  template: string;
};

export type ModifierLayer = { name: string; entries: ModifierEntry[] };

export type ComposedNode = {
  path: BehaviorPath;
  kind: 'group' | 'behavior';
  priority: StellaPriority;
  template: string;
  /** 提供当前定义的层在输入数组中的序号与名称。 */
  layer: number;
  layerName: string;
  entry: number;
  /** 排序后父组的下标；根节点为 -1。 */
  parent: number;
};

export type CompositionErrorReason =
  | 'invalid path'
  | 'duplicate local Add; edit the existing entry'
  | 'group/behavior type conflict'
  | 'missing parent group';

export type TraceOutcome =
  | { kind: 'added' }
  | { kind: 'replaced'; previousLayer: string }
  | { kind: 'removed'; paths: string[] }
  | { kind: 'missing' }
  | { kind: 'error'; reason: CompositionErrorReason };

export type CompositionTrace = {
  layer: number;
  layerName: string;
  entry: number;
  operation: ModifierOperation;
  path: string;
  outcome: TraceOutcome;
};

export type CompositionResult = {
  nodes: ComposedNode[];
  errors: CompositionTrace[];
  trace: CompositionTrace[];
};

export function pathToString(path: BehaviorPath) {
  return [...path.groups, path.name].join('/');
}

const key = (value: string) => value.toLowerCase();

export function samePath(a: BehaviorPath, b: BehaviorPath) {
  return (
    key(a.name) === key(b.name) &&
    a.groups.length === b.groups.length &&
    a.groups.every((group, index) => key(group) === key(b.groups[index]))
  );
}

/** 对应 `FStellaUtilityAIBehaviorPath::Parent`：根路径的父路径为空名称，不会匹配任何节点。 */
export function parentPath(path: BehaviorPath): BehaviorPath {
  if (!path.groups.length) return { groups: [], name: '' };
  return { groups: path.groups.slice(0, -1), name: path.groups[path.groups.length - 1] };
}

/** 对应 `FStellaUtilityAIBehaviorPath::IsWithin`：path 位于 group 这个组路径之下（任意深度）。 */
export function isWithin(path: BehaviorPath, group: BehaviorPath) {
  if (path.groups.length <= group.groups.length) return false;
  for (let index = 0; index < group.groups.length; index++) {
    if (key(path.groups[index]) !== key(group.groups[index])) return false;
  }
  return key(path.groups[group.groups.length]) === key(group.name);
}

const validName = (value: string) => value.length > 0 && !value.includes('/');
export function isValidPath(path: BehaviorPath) {
  return validName(path.name) && path.groups.every(validName);
}

/** 按层顺序依次应用条目，同路径后层整条替换前层；结果按路径字符串排序。 */
export function composeModifiers(layers: ModifierLayer[]): CompositionResult {
  let nodes: ComposedNode[] = [];
  const trace: CompositionTrace[] = [];
  layers.forEach((layer, layerIndex) => {
    let localAdds: BehaviorPath[] = [];
    layer.entries.forEach((entry, entryIndex) => {
      const record = (outcome: TraceOutcome) =>
        trace.push({
          layer: layerIndex,
          layerName: layer.name,
          entry: entryIndex,
          operation: entry.operation,
          path: pathToString(entry.path),
          outcome,
        });
      if (!isValidPath(entry.path)) return record({ kind: 'error', reason: 'invalid path' });
      const add = entry.operation === 'AddGroup' || entry.operation === 'AddBehavior';
      const group = entry.operation === 'AddGroup' || entry.operation === 'RemoveGroup';
      if (add && localAdds.some((path) => samePath(path, entry.path))) {
        return record({ kind: 'error', reason: 'duplicate local Add; edit the existing entry' });
      }
      const existing = nodes.findIndex((node) => samePath(node.path, entry.path));
      if (existing !== -1 && (nodes[existing].kind === 'group') !== group) {
        return record({ kind: 'error', reason: 'group/behavior type conflict' });
      }
      if (!add) {
        const matches = (path: BehaviorPath) =>
          samePath(path, entry.path) || (group && isWithin(path, entry.path));
        localAdds = localAdds.filter((path) => !matches(path));
        const removed = nodes.filter((node) => matches(node.path));
        nodes = nodes.filter((node) => !matches(node.path));
        return record(
          removed.length
            ? { kind: 'removed', paths: removed.map((node) => pathToString(node.path)) }
            : { kind: 'missing' },
        );
      }
      const parent = nodes.find(
        (node) => node.kind === 'group' && samePath(node.path, parentPath(entry.path)),
      );
      if (entry.path.groups.length && !parent) {
        return record({ kind: 'error', reason: 'missing parent group' });
      }
      const node: ComposedNode = {
        path: entry.path,
        kind: group ? 'group' : 'behavior',
        priority: parent ? parent.priority : entry.rootPriority,
        template: entry.template,
        layer: layerIndex,
        layerName: layer.name,
        entry: entryIndex,
        parent: -1,
      };
      const previous = existing === -1 ? undefined : nodes[existing];
      if (previous) nodes[existing] = node;
      else nodes.push(node);
      // 组被重新定义时只替换组本身，子项保留并改用新组的优先级。
      if (group) {
        for (const child of nodes) {
          if (isWithin(child.path, entry.path)) child.priority = node.priority;
        }
      }
      localAdds.push(entry.path);
      record(
        previous ? { kind: 'replaced', previousLayer: previous.layerName } : { kind: 'added' },
      );
    });
  });
  const sortKey = (node: ComposedNode) => key(pathToString(node.path));
  nodes.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  for (const node of nodes) {
    node.parent = nodes.findIndex(
      (candidate) => candidate.kind === 'group' && samePath(candidate.path, parentPath(node.path)),
    );
  }
  return { nodes, errors: trace.filter((item) => item.outcome.kind === 'error'), trace };
}

const operations: ModifierOperation[] = [
  'AddGroup',
  'AddBehavior',
  'RemoveGroup',
  'RemoveBehavior',
];

/**
 * 读取演示场景文本：`层 名称` 开始一层，随后每行一个条目，
 * 例如 `AddGroup Combat Critical 战斗组`、`AddBehavior Combat/Attack 普通攻击`、`RemoveBehavior Idle`。
 * 优先级可省略（默认 Normal），其余文字作为模板显示名；空行与 `//` 开头的行忽略。
 */
export function parseModifierScenario(source: string) {
  const layers: ModifierLayer[] = [];
  const problems: string[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    const [head, ...rest] = line.split(/\s+/);
    if (head === '层') {
      layers.push({ name: rest.join(' ') || `第 ${layers.length + 1} 层`, entries: [] });
      return;
    }
    const operation = operations.find((item) => item === head);
    if (!operation) return void problems.push(`第 ${index + 1} 行无法识别：${line}`);
    if (!layers.length) return void problems.push(`第 ${index + 1} 行出现在第一个“层”之前`);
    const [rawPath = '', ...tail] = rest;
    const segments = rawPath.split('/');
    let rootPriority: StellaPriority = 'Normal';
    if (tail[0] === 'Critical' || tail[0] === 'Normal')
      rootPriority = tail.shift() as StellaPriority;
    layers[layers.length - 1].entries.push({
      operation,
      path: { groups: segments.slice(0, -1), name: segments[segments.length - 1] },
      rootPriority,
      template: tail.join(' '),
    });
  });
  return { layers, problems };
}
