import Link from 'next/link';
import { House, ArrowUpRight, ChevronRight, ListTree, Network } from 'lucide-react';
import { ReadingModulePicker } from '@/components/module-picker';
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
  const module = modules.find((module) => module.key === active)!;
  const choices = modules.map((module) => {
    const pages = flattenNavigation(module.entries);
    const first = module.overview ?? pages[0];
    return {
      key: module.key,
      count: pages.length,
      url: first.url,
    };
  });
  const navigation = (
    <nav aria-label="模块与功能目录">
      <span className="sidebar-module-title">{module.label}</span>
      <Entries entries={module.entries} current={current.slug} />
    </nav>
  );
  return (
    <aside className="reading-sidebar" key={current.slug}>
      <Link href="/" className="sidebar-home">
        <House size={14} />
        回到首页
      </Link>
      <span className="sidebar-label">模块与功能</span>
      <div className="desktop-doc-menu">
        <ReadingModulePicker modules={choices} current={active} />
        {navigation}
      </div>
      <details className="mobile-doc-menu">
        <summary>
          <ListTree size={17} aria-hidden="true" />
          <span>文档目录</span>
          <small>{module.label}</small>
          <ChevronRight size={15} aria-hidden="true" />
        </summary>
        <ReadingModulePicker modules={choices} current={active} />
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
