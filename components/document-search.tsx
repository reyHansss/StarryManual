'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import {
  articleModules,
  buildModuleNavigation,
  flattenNavigation,
  getArticleLabel,
} from '@/lib/navigation';
import { getSearchTerms, searchArticles, splitMatches, type SearchHit } from '@/lib/search';
import type { Article } from '@/lib/types';

const SearchContext = createContext<() => void>(() => {});

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  return splitMatches(text, terms).map((segment, index) =>
    segment.match ? (
      <mark key={index}>{segment.text}</mark>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    ),
  );
}

/** 页眉与快捷键共用一个全站搜索窗口；方向键在结果间移动，回车打开当前项。 */
export function DocumentSearch({
  articles,
  children,
}: {
  articles: Article[];
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const terms = getSearchTerms(query);
  // 空查询按阅读目录分组浏览，输入后改为按命中程度排序。
  const browse = useMemo(
    () =>
      buildModuleNavigation(articles).flatMap((module) =>
        flattenNavigation(module.entries).map((article): SearchHit => ({ article })),
      ),
    [articles],
  );
  const results = useMemo(
    () => (terms.length ? searchArticles(articles, query) : browse),
    [articles, browse, query, terms.length],
  );
  const close = () => dialog.current?.close();
  const open = () => {
    dialog.current?.showModal();
    input.current?.focus();
    input.current?.select();
    setActive(0);
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

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId, results]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 中文输入法选词时方向键与回车属于候选框，不移动结果或跳转。
    if (event.nativeEvent.isComposing) return;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      close();
      router.push(results[active].article.url);
    }
  }

  return (
    <SearchContext.Provider value={open}>
      {children}
      <dialog
        className="search-dialog"
        aria-label="搜索文档"
        ref={dialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="search-input-row">
          <Search size={20} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索标题、概念或正文…"
            aria-label="搜索标题或正文"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
          />
          <button className="icon-button" onClick={close} aria-label="关闭搜索">
            <X size={18} />
          </button>
        </div>
        <div className="search-results" id={listId} role="listbox" aria-label="搜索结果">
          {results.length ? (
            results.map(({ article, excerpt }, index) => {
              const module = articleModules[article.module];
              const groupStart =
                !terms.length && article.module !== results[index - 1]?.article.module;
              return (
                <Fragment key={article.slug}>
                  {groupStart && (
                    <div className="search-group" role="presentation">
                      <i style={{ background: module.nodeColor }} />
                      {module.label}
                    </div>
                  )}
                  <Link
                    id={`${listId}-${index}`}
                    href={article.url}
                    className="search-result"
                    role="option"
                    aria-selected={index === active}
                    onClick={close}
                    onPointerMove={() => setActive(index)}
                    style={{ '--module-color': module.color } as React.CSSProperties}
                  >
                    <span className="search-result-title">
                      {!!terms.length && <span className="module-label">{module.shortLabel}</span>}
                      <strong>
                        <Highlight text={getArticleLabel(article)} terms={terms} />
                      </strong>
                    </span>
                    <span className="search-result-text">
                      <Highlight text={excerpt ?? article.description} terms={terms} />
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </Fragment>
              );
            })
          ) : (
            <p className="empty-message">没有找到“{query}”。试试「输入」「架构」或「蓝图」。</p>
          )}
        </div>
        <div className="search-footer">
          <span>
            {terms.length ? `找到 ${results.length} 篇` : `全部 ${articles.length} 篇文章`}
          </span>
          <span className="search-keys" aria-hidden="true">
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </dialog>
    </SearchContext.Provider>
  );
}

export function SearchTrigger() {
  const open = useContext(SearchContext);
  return (
    <button
      className="search-trigger"
      onClick={open}
      aria-label="搜索文档"
      aria-keyshortcuts="Control+K"
    >
      <Search size={15} aria-hidden="true" />
      <span>搜索文档…</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}
