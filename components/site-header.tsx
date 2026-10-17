'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Search, X, Pencil, ArrowRight } from 'lucide-react';
import type { Article } from '@/lib/types';
import { articleModules } from '@/lib/navigation';
import { isStaticExport } from '@/lib/site-config';

export function StarMark() {
  const gradient = `brand-star-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-star-sky)" />
          <stop offset="0.65" stopColor="var(--brand-star-pink)" />
        </linearGradient>
      </defs>
      <path
        d="M16 1l3.8 11.2L31 16l-11.2 3.8L16 31l-3.8-11.2L1 16l11.2-3.8L16 1Z"
        fill={`url(#${gradient})`}
      />
      <circle cx="25.5" cy="6.5" r="2" fill={`url(#${gradient})`} />
    </svg>
  );
}

export function SiteHeader({ articles }: { articles: Article[] }) {
  const path = usePathname();
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
    <>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Starry手册 首页">
          <StarMark />
          <span>
            starry<span className="brand-light"> / 手册</span>
          </span>
        </Link>
        <nav className="main-nav" aria-label="主导航">
          {[
            ['/read', '阅读文档'],
            ['/graph', '知识图谱'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href === '/read' ? '/read/start-here' : href}
              className={path.startsWith(href) ? 'active' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button className="search-trigger" onClick={open} aria-label="搜索文档">
            <Search size={15} />
            <span>搜索</span>
            <kbd>Ctrl K</kbd>
          </button>
          {!isStaticExport && (
            <a href="/keystatic" className="editor-link">
              <Pencil size={14} />
              <span>编辑内容</span>
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </header>
      <dialog
        className="search-dialog"
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
    </>
  );
}
