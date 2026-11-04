/**
 * 输入缓存规则的网页演示版本，对应项目源码：
 * - `UStarryInputManagerComponent::Dispatch`：处理器可缓存且所属通道已打开时登记命令，否则立即执行；
 * - `UStarryInputBufferComponent::BufferInputCommands`：同一次输入按通道分组，按模式写入或丢弃；
 * - `CloseInputBuffer`／`ResetInputBuffer`：正常关闭按顺序执行，取消关闭丢弃，重置清空全部通道。
 * 只模拟命令去向，不模拟 Enhanced Input 触发器或处理器内部逻辑；源码规则变化时同步修改。
 */

export type InputBufferMode = 'Disabled' | 'FirstCommand' | 'LastCommand';

/** 处理器默认不可缓存，默认通道与源码的 `Input.Buffer.Channel.Default` 一致。 */
export const DEFAULT_BUFFER_CHANNEL = 'Input.Buffer.Channel.Default';

export type BufferHandler = { name: string; canBeBuffered: boolean; channel: string };
/** 一个动作事件按登记顺序分派给这些处理器。 */
export type BufferAction = { name: string; handlers: string[] };

export type BufferEvent =
  | { kind: 'open'; channel: string }
  | { kind: 'close'; channel: string; cancelled: boolean }
  | { kind: 'input'; action: string }
  | { kind: 'reset' };

export type BufferScenario = {
  mode: InputBufferMode;
  handlers: BufferHandler[];
  actions: BufferAction[];
  events: BufferEvent[];
};

export type BufferOutcome =
  | { kind: 'executed'; handler: string; delayed: boolean; channel?: string }
  | { kind: 'stored'; channel: string; handlers: string[]; replaced?: string[] }
  | { kind: 'dropped'; channel: string; handlers: string[]; kept: string[] }
  | { kind: 'discarded'; channel: string; handlers: string[] }
  | { kind: 'opened'; channel: string; already: boolean }
  | { kind: 'closed'; channel: string; open: boolean; empty: boolean }
  | { kind: 'reset' }
  | { kind: 'unknown'; action: string };

export type BufferStep = {
  event: BufferEvent;
  outcomes: BufferOutcome[];
  /** 本步结束后仍打开的通道与各通道等待执行的处理器。 */
  open: string[];
  stored: { channel: string; action: string; handlers: string[] }[];
};

export function simulateInputBuffer(scenario: BufferScenario): BufferStep[] {
  const handlers = new Map(scenario.handlers.map((handler) => [handler.name, handler]));
  const actions = new Map(scenario.actions.map((action) => [action.name, action]));
  // Disabled 时缓存组件不可用，Dispatch 拿不到缓存接口，所有处理器立即执行（假设宿主上没有其他启用的缓存组件）。
  const available = scenario.mode !== 'Disabled';
  const open = new Set<string>();
  const stored = new Map<string, { action: string; handlers: string[] }>();
  const canAdd = (channel: string) =>
    scenario.mode === 'LastCommand' || (scenario.mode === 'FirstCommand' && !stored.has(channel));
  return scenario.events.map((event) => {
    const outcomes: BufferOutcome[] = [];
    if (event.kind === 'open') {
      outcomes.push({ kind: 'opened', channel: event.channel, already: open.has(event.channel) });
      open.add(event.channel);
    } else if (event.kind === 'close') {
      const wasOpen = open.has(event.channel);
      const batch = stored.get(event.channel);
      if (wasOpen && batch && event.cancelled) {
        outcomes.push({ kind: 'discarded', channel: event.channel, handlers: batch.handlers });
      } else if (wasOpen && batch) {
        for (const handler of batch.handlers) {
          outcomes.push({ kind: 'executed', handler, delayed: true, channel: event.channel });
        }
      }
      outcomes.push({ kind: 'closed', channel: event.channel, open: wasOpen, empty: !batch });
      open.delete(event.channel);
      stored.delete(event.channel);
    } else if (event.kind === 'reset') {
      open.clear();
      stored.clear();
      outcomes.push({ kind: 'reset' });
    } else {
      const action = actions.get(event.action);
      if (!action) {
        outcomes.push({ kind: 'unknown', action: event.action });
      } else {
        const byChannel = new Map<string, string[]>();
        for (const name of action.handlers) {
          const handler = handlers.get(name);
          if (!handler) continue;
          if (available && handler.canBeBuffered && open.has(handler.channel)) {
            const list = byChannel.get(handler.channel) ?? [];
            if (!list.includes(name)) list.push(name);
            byChannel.set(handler.channel, list);
          } else {
            outcomes.push({ kind: 'executed', handler: name, delayed: false });
          }
        }
        // 同一通道的命令保持本次输入中的顺序，首批／末批按通道分别判断。
        for (const [channel, names] of byChannel) {
          const previous = stored.get(channel);
          if (!canAdd(channel)) {
            outcomes.push({
              kind: 'dropped',
              channel,
              handlers: names,
              kept: previous?.handlers ?? [],
            });
            continue;
          }
          stored.set(channel, { action: action.name, handlers: names });
          outcomes.push({ kind: 'stored', channel, handlers: names, replaced: previous?.handlers });
        }
      }
    }
    return {
      event,
      outcomes,
      open: [...open],
      stored: [...stored].map(([channel, batch]) => ({ channel, ...batch })),
    };
  });
}

const modes: InputBufferMode[] = ['Disabled', 'FirstCommand', 'LastCommand'];

/**
 * 读取演示场景文本，每行一条：
 * `模式 LastCommand`、`处理器 名称 缓存 [通道]`、`处理器 名称 不缓存`、`动作 名称 处理器...`，
 * 以及按顺序执行的 `打开 通道`、`输入 动作`、`关闭 通道`、`取消 通道`、`重置`。
 * 通道省略时使用默认通道；空行与 `//` 开头的行忽略。
 */
export function parseInputBufferScenario(source: string) {
  const scenario: BufferScenario = { mode: 'LastCommand', handlers: [], actions: [], events: [] };
  const problems: string[] = [];
  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    const [head, first, ...rest] = line.split(/\s+/);
    const fail = () => problems.push(`第 ${index + 1} 行无法识别：${line}`);
    if (head === '模式') {
      const mode = modes.find((item) => item === first);
      if (mode) scenario.mode = mode;
      else fail();
    } else if (head === '处理器' && first) {
      const [kind, channel] = rest;
      if (kind !== '缓存' && kind !== '不缓存') return void fail();
      scenario.handlers.push({
        name: first,
        canBeBuffered: kind === '缓存',
        channel: channel ?? DEFAULT_BUFFER_CHANNEL,
      });
    } else if (head === '动作' && first) {
      scenario.actions.push({ name: first, handlers: rest });
    } else if (head === '打开' || head === '关闭' || head === '取消') {
      const channel = first ?? DEFAULT_BUFFER_CHANNEL;
      scenario.events.push(
        head === '打开'
          ? { kind: 'open', channel }
          : { kind: 'close', channel, cancelled: head === '取消' },
      );
    } else if (head === '输入' && first) {
      scenario.events.push({ kind: 'input', action: first });
    } else if (head === '重置') {
      scenario.events.push({ kind: 'reset' });
    } else fail();
  });
  return { scenario, problems };
}
