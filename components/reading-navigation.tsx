import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ChevronRight, ListTree, Network } from 'lucide-react';
import {
  flattenNavigation,
  getArticleLabel,
  type ModuleNavigation,
  type NavigationEntry,
} from '@/lib/navigation';
import type { Article } from '@/lib/types';

function Entries({ entries, current }: { entries: NavigationEntry[]; current: string }) {
  return (
    <ul className="sidebar-tree">
      {entries.map((entry) => (
        <li key={entry.kind === 'article' ? entry.article.slug : entry.label}>
          {entry.kind === 'article' ? (
            <Link
              href={entry.article.url}
              className={`sidebar-page ${current === entry.article.slug ? 'selected' : ''}`}
              aria-current={current === entry.article.slug ? 'page' : undefined}
            >
              {getArticleLabel(entry.article)}
            </Link>
          ) : (
            <details open={flattenNavigation(entry.entries).some((page) => page.slug === current)}>
              <summary>
                <ChevronRight size={13} aria-hidden="true" />
                <span>{entry.label}</span>
              </summary>
              <Entries entries={entry.entries} current={current} />
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReadingNavigation({
  modules,
  current,
}: {
  modules: ModuleNavigation[];
  current: Article;
}) {
  const active = current.module;
  const navigation = (
    <nav aria-label="模块与功能目录">
      {modules.map((module) => (
        <details className="sidebar-module" key={module.key} open={module.key === active}>
          <summary>
            <i style={{ background: module.color }} />
            <span>{module.label}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </summary>
          <Entries entries={module.entries} current={current.slug} />
        </details>
      ))}
    </nav>
  );
  return (
    <aside className="reading-sidebar" key={current.slug}>
      <Link href="/" className="sidebar-home">
        <ArrowLeft size={14} />
        回到首页
      </Link>
      <span className="sidebar-label">模块与功能</span>
      <div className="desktop-doc-menu">{navigation}</div>
      <details className="mobile-doc-menu">
        <summary>
          <ListTree size={17} aria-hidden="true" />
          <span>文档目录</span>
          <small>{modules.find((module) => module.key === active)?.label}</small>
          <ChevronRight size={15} aria-hidden="true" />
        </summary>
        {navigation}
      </details>
      <Link href="/graph" className="sidebar-graph">
        <Network size={16} />
        <span>在图谱里探索</span>
        <ArrowUpRight size={14} />
      </Link>
    </aside>
  );
}
