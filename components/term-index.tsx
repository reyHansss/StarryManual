'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { articleModules, type ModuleKey } from '@/lib/navigation';
import { filterTerms, type TermEntry } from '@/lib/terms';
import styles from './terms.module.css';

/** 术语页：按模块分组列出全部术语，输入关键词即时筛选名称、别名与解释。 */
export function TermIndex({ entries }: { entries: TermEntry[] }) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterTerms(entries, query), [entries, query]);
  const groups = (Object.keys(articleModules) as ModuleKey[])
    .map((key) => ({ key, items: visible.filter((entry) => entry.module === key) }))
    .filter((group) => group.items.length > 0);
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="筛选术语、别名或解释，例如 Experience、输入缓存"
          aria-label="筛选术语"
        />
        <span className={styles.count} aria-live="polite">
          {query ? `找到 ${visible.length} 个` : `共 ${entries.length} 个`}术语
        </span>
      </div>
      {groups.length === 0 && <p className={styles.empty}>没有匹配的术语。</p>}
      {groups.map(({ key, items }) => (
        <section
          className={styles.group}
          key={key}
          aria-label={articleModules[key].label}
          style={
            {
              '--module-color': articleModules[key].nodeColor,
              '--module-ink': articleModules[key].color,
            } as React.CSSProperties
          }
        >
          <h2>
            <i aria-hidden="true" />
            {articleModules[key].label}
          </h2>
          <dl className={styles.list}>
            {items.map((entry) => (
              <div className={styles.item} key={`${entry.slug}:${entry.term}`}>
                <dt>
                  {entry.term}
                  {entry.aliases.length > 0 && (
                    <span className={styles.aliases}>{entry.aliases.join(' · ')}</span>
                  )}
                </dt>
                <dd>{entry.brief}</dd>
                <dd className={styles.source}>
                  定义见 <Link href={entry.url}>{entry.title}</Link>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
