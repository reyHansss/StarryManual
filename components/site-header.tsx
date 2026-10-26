'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId } from 'react';
import { EditorLink } from '@/components/editor-link';
import { SearchTrigger } from '@/components/document-search';
import { ParticleMotionToggle } from '@/components/particle-effects';

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

export function SiteHeader() {
  const path = usePathname();
  const reading = path.startsWith('/read');
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Starry手册 首页">
        <StarMark />
        <span>
          starry<span className="brand-light"> / 手册</span>
        </span>
      </Link>
      <nav className="main-nav" aria-label="主导航">
        <Link
          href="/read/start-here"
          className={reading ? 'active' : ''}
          aria-current={reading ? 'true' : undefined}
        >
          阅读文档
        </Link>
        <Link
          href="/graph"
          className={path.startsWith('/graph') ? 'active' : ''}
          aria-current={path.startsWith('/graph') ? 'true' : undefined}
        >
          关系图谱
        </Link>
      </nav>
      <div className="header-actions">
        <SearchTrigger />
        <EditorLink className="editor-link" />
        <ParticleMotionToggle />
      </div>
      {/* 阅读进度由滚动时间线直接驱动，不监听滚动事件；浏览器不支持时不显示。 */}
      {reading && <span className="reading-progress" aria-hidden="true" />}
    </header>
  );
}
