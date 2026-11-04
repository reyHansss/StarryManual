'use client';

import { useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import {
  parseInputBufferScenario,
  simulateInputBuffer,
  type BufferEvent,
  type BufferOutcome,
  type InputBufferMode,
} from '@/lib/input-buffer';
import styles from './demo.module.css';

const modes: InputBufferMode[] = ['Disabled', 'FirstCommand', 'LastCommand'];

function eventLabel(event: BufferEvent) {
  switch (event.kind) {
    case 'open':
      return `打开通道 ${event.channel}`;
    case 'close':
      return `${event.cancelled ? '取消关闭' : '关闭'}通道 ${event.channel}`;
    case 'input':
      return `输入 ${event.action}`;
    case 'reset':
      return '重置缓存';
  }
}

function Outcome({ outcome }: { outcome: BufferOutcome }) {
  switch (outcome.kind) {
    case 'executed':
      return (
        <span className={styles.chip} data-tone="run">
          {outcome.handler} {outcome.delayed ? '关窗执行' : '立即执行'}
        </span>
      );
    case 'stored':
      return (
        <span className={styles.chip} data-tone="stored">
          {outcome.handlers.join('、')} 存入 {outcome.channel}
          {outcome.replaced ? `，替换 ${outcome.replaced.join('、')}` : ''}
        </span>
      );
    case 'dropped':
      return (
        <span className={styles.chip} data-tone="warn">
          {outcome.handlers.join('、')} 被丢弃（{outcome.channel} 已保留 {outcome.kept.join('、')}）
        </span>
      );
    case 'discarded':
      return (
        <span className={styles.chip} data-tone="warn">
          丢弃 {outcome.handlers.join('、')}
        </span>
      );
    case 'opened':
      return <span className={styles.chip}>{outcome.already ? '已经打开' : '通道打开'}</span>;
    case 'closed':
      return (
        <span className={styles.chip}>
          {!outcome.open ? '通道未打开，没有变化' : outcome.empty ? '没有待执行命令' : '通道关闭'}
        </span>
      );
    case 'reset':
      return <span className={styles.chip}>全部通道与命令清空</span>;
    case 'unknown':
      return (
        <span className={styles.chip} data-tone="warn">
          场景中没有动作 {outcome.action}
        </span>
      );
  }
}

/**
 * 按项目输入缓存规则推演一段操作：切换缓存模式即可比较同一串输入的命令去向。
 * 场景文本由文章提供，格式见 `parseInputBufferScenario`。
 */
export function InputBufferDemo({ title, source }: { title: string; source: string }) {
  const { scenario, problems } = useMemo(() => parseInputBufferScenario(source), [source]);
  const [mode, setMode] = useState(scenario.mode);
  const steps = useMemo(() => simulateInputBuffer({ ...scenario, mode }), [scenario, mode]);
  return (
    <figure className={`${styles.demo} article-demo not-prose`}>
      <figcaption className={styles.caption}>
        <span>
          <Timer size={17} aria-hidden="true" />
          {title}
        </span>
        <span className={styles.kind}>交互演示 · 规则同 Dispatch 与 BufferInputCommands</span>
      </figcaption>
      <div className={styles.body}>
        {problems.length > 0 && <p className={styles.problems}>{problems.join('；')}</p>}
        <div className={styles.toolbar}>
          <div className={styles.segmented} role="group" aria-label="InputBufferMode">
            {modes.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={item === mode}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <span>
            {mode === 'Disabled'
              ? '缓存未启用：Dispatch 取不到缓存组件，处理器全部立即执行。'
              : mode === 'FirstCommand'
                ? '每个通道保留窗口内的第一批命令，之后同通道的输入被丢弃。'
                : '每个通道保留窗口关闭前的最后一批命令（源码默认）。'}
          </span>
        </div>
        <ul className={styles.legend} aria-label="处理器">
          {scenario.handlers.map((handler) => (
            <li key={handler.name}>
              <strong>{handler.name}</strong>{' '}
              <span className={styles.muted}>
                {handler.canBeBuffered ? `可缓存 · ${handler.channel}` : '不可缓存'}
              </span>
            </li>
          ))}
        </ul>
        <ol className={styles.timeline} aria-live="polite">
          {steps.map((step, index) => (
            <li className={styles.step} key={index}>
              <span className={styles.stepIndex}>{index + 1}</span>
              <div className={styles.stepMain}>
                <span className={styles.stepEvent}>{eventLabel(step.event)}</span>
                <div className={styles.outcomes}>
                  {step.outcomes.map((outcome, key) => (
                    <Outcome outcome={outcome} key={key} />
                  ))}
                </div>
                <span className={styles.state}>
                  打开的通道：{step.open.length ? step.open.join('、') : '无'}
                  {step.stored.length > 0 &&
                    `；等待执行：${step.stored
                      .map((batch) => `${batch.channel} ← ${batch.handlers.join('、')}`)
                      .join('；')}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className={styles.footer}>
          <p>
            每次“输入”代表一次动作事件的分派。项目里的窗口由动画通知状态 Input Buffer
            打开；通知正常播放到末尾时关闭并执行，Montage
            中断等未到末尾的情况按取消处理。处理器是否可缓存、属于哪个通道在 Handler 上配置。
          </p>
          {mode !== scenario.mode && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setMode(scenario.mode)}
            >
              恢复场景模式
            </button>
          )}
        </div>
      </div>
    </figure>
  );
}
