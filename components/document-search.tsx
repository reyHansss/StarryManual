'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { articleModules } from '@/lib/navigation';
import type { Article } from '@/lib/types';

const SearchContext = createContext<() => void>(() => {});

/** 页眉与快捷键共用一个全站搜索窗口。 */
export function DocumentSearch({
  articles,
  children,
}: {
  articles: Article[];
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const open = () => {
    dialog.current?.showModal();
    input.current?.focus();
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const results = articles.filter((article) =>
    `${article.title} ${article.description} ${article.text}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <SearchContext.Provider value={open}>
      {children}
      <dialog
        className="search-dialog"
        aria-label="搜索文档"
        ref={dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="search-input-row">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、概念或正文…"
            aria-label="搜索标题或正文"
          />
          <button
            className="icon-button"
            onClick={() => dialog.current?.close()}
            aria-label="关闭搜索"
          >
            <X size={18} />
          </button>
        </div>
        <div className="search-results">
          {results.length ? (
            results.map((article) => (
              <Link href={article.url} key={article.slug} onClick={() => dialog.current?.close()}>
                <span
                  className="module-label"
                  style={
                    {
                      '--module-color': articleModules[article.module].color,
                    } as React.CSSProperties
                  }
                >
                  {articleModules[article.module].shortLabel}
                </span>
                <strong>{article.title}</strong>
                <span>{article.description}</span>
                <ArrowRight size={16} />
              </Link>
            ))
          ) : (
            <p className="empty-message">没有找到“{query}”。试试「输入」「架构」或「蓝图」。</p>
          )}
        </div>
        <div className="search-footer">
          搜索本站全部文章 <span>Esc 关闭</span>
        </div>
      </dialog>
    </SearchContext.Provider>
  );
}

export function SearchTrigger() {
  const open = useContext(SearchContext);
  return (
    <button className="search-trigger" onClick={open} aria-label="搜索文档">
      <Search size={15} />
      <span>搜索</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}
