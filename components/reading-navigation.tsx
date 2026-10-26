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
    <nav aria-label="模块与功能目录" className="sidebar-nav">
      <Entries entries={module.entries} current={current.slug} />
    </nav>
  );
  return (
    <aside className="reading-sidebar" key={current.slug}>
      {/* 侧栏占满视口高度：模块切换在上，目录独立滚动，常用出口固定在底部。 */}
      <div className="desktop-doc-menu">
        <ReadingModulePicker modules={choices} current={active} />
        {navigation}
        <div className="sidebar-links">
          <Link href="/">
            <House size={15} aria-hidden="true" />
            回到首页
          </Link>
          <Link href={`/graph?module=${active}`}>
            <Network size={15} aria-hidden="true" />
            模块关系图谱
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
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
    </aside>
  );
}
