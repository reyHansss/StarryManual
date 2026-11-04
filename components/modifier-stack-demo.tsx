'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Layers } from 'lucide-react';
import {
  composeModifiers,
  parseModifierScenario,
  pathToString,
  type CompositionErrorReason,
  type CompositionTrace,
} from '@/lib/stellaai-composition';
import styles from './demo.module.css';

const reasonText: Record<CompositionErrorReason, string> = {
  'invalid path': '路径无效（名称为空或含有 /）',
  'duplicate local Add; edit the existing entry': '同一层重复添加同一路径',
  'group/behavior type conflict': '同一路径已经是另一种类型（组／行为）',
  'missing parent group': '父组不存在，先添加父组',
};

function describe(item: CompositionTrace) {
  const outcome = item.outcome;
  switch (outcome.kind) {
    case 'added':
      return { text: '新增', tone: 'run' };
    case 'replaced':
      return { text: `替换 ${outcome.previousLayer} 的定义`, tone: 'replaced' };
    case 'removed':
      return { text: `移除 ${outcome.paths.join('、')}`, tone: 'warn' };
    case 'missing':
      return { text: '目标不存在，没有变化', tone: undefined };
    case 'error':
      return { text: `报错：${reasonText[outcome.reason]}`, tone: 'warn' };
  }
}

/**
 * 按 StellaAI 的组合规则实时计算最终行为集合：读者可以启用、停用或调整各层顺序。
 * 场景文本由文章提供，格式见 `parseModifierScenario`。
 */
export function ModifierStackDemo({ title, source }: { title: string; source: string }) {
  const { layers, problems } = useMemo(() => parseModifierScenario(source), [source]);
  const initial = useMemo(() => layers.map((_, index) => ({ index, enabled: true })), [layers]);
  const [order, setOrder] = useState(initial);
  // 层数很少，每次直接重算即可，结果与源码同样从空集合开始逐层应用。
  const result = composeModifiers(
    order.filter((item) => item.enabled).map((item) => layers[item.index]),
  );
  const move = (position: number, offset: number) =>
    setOrder((current) => {
      const next = [...current];
      [next[position], next[position + offset]] = [next[position + offset], next[position]];
      return next;
    });
  const replacedBy = (layer: number, entry: number) => {
    const item = result.trace.find(
      (candidate) => candidate.layer === layer && candidate.entry === entry,
    );
    return item?.outcome.kind === 'replaced' ? item.outcome.previousLayer : undefined;
  };
  return (
    <figure className={`${styles.demo} article-demo not-prose`}>
      <figcaption className={styles.caption}>
        <span>
          <Layers size={17} aria-hidden="true" />
          {title}
        </span>
        <span className={styles.kind}>交互演示 · 规则同 FStellaAIComposition::Build</span>
      </figcaption>
      <div className={styles.body}>
        {problems.length > 0 && <p className={styles.problems}>{problems.join('；')}</p>}
        <div className={styles.columns}>
          <section className={styles.panel} aria-label="Modifier 层">
            <h4>
              Modifier 层<small>从上到下依次应用</small>
            </h4>
            <ol className={styles.list}>
              {order.map((item, position) => {
                const layer = layers[item.index];
                return (
                  <li className={styles.layer} data-off={!item.enabled} key={item.index}>
                    <div className={styles.layerHead}>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() =>
                            setOrder((current) =>
                              current.map((value, index) =>
                                index === position ? { ...value, enabled: !value.enabled } : value,
                              ),
                            )
                          }
                        />
                        <span className={styles.order}>{position + 1}</span>
                        <span>{layer.name}</span>
                      </label>
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={position === 0}
                        onClick={() => move(position, -1)}
                        aria-label={`上移 ${layer.name}`}
                      >
                        <ArrowUp size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={position === order.length - 1}
                        onClick={() => move(position, 1)}
                        aria-label={`下移 ${layer.name}`}
                      >
                        <ArrowDown size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <ul className={styles.entries}>
                      {layer.entries.map((entry, index) => (
                        <li key={index}>
                          <span className={styles.op} data-op={entry.operation}>
                            {entry.operation}
                          </span>
                          <span className={styles.code}>{pathToString(entry.path)}</span>
                          {entry.operation.startsWith('Add') && entry.path.groups.length === 0 && (
                            <span className={styles.muted}>{entry.rootPriority}</span>
                          )}
                          {entry.template && <span className={styles.muted}>{entry.template}</span>}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className={styles.panel} aria-label="最终行为集合" aria-live="polite">
            <h4>
              最终行为集合<small>{result.nodes.length} 个节点，按路径排序</small>
            </h4>
            {result.nodes.length ? (
              <ul className={styles.tree}>
                {result.nodes.map((node) => {
                  const previous = replacedBy(node.layer, node.entry);
                  return (
                    <li
                      className={styles.node}
                      key={pathToString(node.path)}
                      style={{ paddingLeft: node.path.groups.length * 18 }}
                    >
                      <span aria-hidden="true">{node.kind === 'group' ? '▾' : '•'}</span>
                      <strong>{node.path.name}</strong>
                      <span className={styles.chip}>{node.kind === 'group' ? '组' : '行为'}</span>
                      <span
                        className={styles.chip}
                        data-tone={node.priority === 'Critical' ? 'critical' : undefined}
                      >
                        {node.priority}
                      </span>
                      {node.template && <span className={styles.muted}>{node.template}</span>}
                      <span className={styles.chip} data-tone={previous ? 'replaced' : undefined}>
                        来自 {node.layerName}
                        {previous ? `（覆盖 ${previous}）` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>没有启用的层，集合为空。</p>
            )}
            {result.errors.length > 0 && (
              <ul className={styles.errors}>
                {result.errors.map((item, index) => (
                  <li key={index}>
                    <strong>{item.layerName}</strong> 第 {item.entry + 1} 条 {item.operation}{' '}
                    <span className={styles.code}>{item.path}</span>：
                    {item.outcome.kind === 'error' && reasonText[item.outcome.reason]}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <details className={styles.details}>
          <summary>逐条应用记录（{result.trace.length} 条）</summary>
          <ol className={styles.trace}>
            {result.trace.map((item, index) => {
              const { text, tone } = describe(item);
              return (
                <li key={index}>
                  <span className={styles.muted}>{item.layerName}</span>
                  <span className={styles.op} data-op={item.operation}>
                    {item.operation}
                  </span>
                  <span className={styles.code}>{item.path}</span>
                  <span className={styles.chip} data-tone={tone}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ol>
        </details>
        <div className={styles.footer}>
          <p>
            出错的条目会被跳过。运行时：Stack 初始化出错则整个初始化失败；运行中
            AddModifier／MoveModifier 的结果出错会被拒绝（Rejected）并保持原组合；RemoveModifier
            照常执行。
          </p>
          <button type="button" className={styles.textButton} onClick={() => setOrder(initial)}>
            恢复初始顺序
          </button>
        </div>
      </div>
    </figure>
  );
}
