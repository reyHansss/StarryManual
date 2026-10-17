'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Waypoints } from 'lucide-react';
import { getDiagramKind } from '@/lib/diagram';

/** 文章只提供关系文本；自动布局、字体和配色统一复用手册主题。 */
export function Diagram({ title, source }: { title: string; source: string }) {
  const element = useRef<HTMLElement>(null);
  const id = `diagram-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const [rendered, setRendered] = useState<{
    source: string;
    svg: string;
    minimumWidth: number;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    const target = element.current!;
    let disposed = false;
    async function render() {
      try {
        const { default: mermaid } = await import('mermaid');
        if (disposed) return;
        const theme = getComputedStyle(target);
        const color = (name: string) => theme.getPropertyValue(name).trim();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: 'base',
          fontFamily: color('--font-sans'),
          themeVariables: {
            primaryColor: color('--accent-soft'),
            primaryTextColor: color('--text'),
            primaryBorderColor: color('--accent'),
            secondaryColor: color('--pink-soft'),
            secondaryTextColor: color('--text'),
            secondaryBorderColor: color('--coral'),
            tertiaryColor: color('--mint-soft'),
            tertiaryTextColor: color('--text'),
            tertiaryBorderColor: color('--success'),
            lineColor: color('--accent'),
            textColor: color('--text'),
            mainBkg: color('--accent-soft'),
            nodeBorder: color('--accent'),
            clusterBkg: color('--surface-soft'),
            clusterBorder: color('--border'),
            edgeLabelBackground: color('--surface'),
            actorBkg: color('--accent-soft'),
            actorBorder: color('--accent'),
            actorTextColor: color('--text'),
            signalColor: color('--accent'),
            signalTextColor: color('--text'),
            labelBoxBkgColor: color('--pink-soft'),
            labelBoxBorderColor: color('--coral'),
            labelTextColor: color('--text'),
            activationBkgColor: color('--mint-soft'),
            activationBorderColor: color('--success'),
            noteBkgColor: color('--pink-soft'),
            noteBorderColor: color('--coral'),
            noteTextColor: color('--text'),
          },
          flowchart: {
            htmlLabels: false,
            curve: 'basis',
            padding: 16,
            nodeSpacing: 32,
            rankSpacing: 44,
          },
          sequence: { useMaxWidth: true, wrap: true, actorMargin: 65 },
        });
        const result = await mermaid.render(id, source);
        const viewBox = new DOMParser()
          .parseFromString(result.svg, 'image/svg+xml')
          .documentElement.getAttribute('viewBox')
          ?.split(/\s+/)
          .map(Number);
        // 自动适配不能无限缩小文字；保留至少 90% 原始比例，宽图在内部横向滚动。
        const minimumWidth = (viewBox?.[2] ?? 580) * 0.9;
        if (!disposed) setRendered({ source, svg: result.svg, minimumWidth, error: false });
      } catch {
        if (!disposed) setRendered({ source, svg: '', minimumWidth: 0, error: true });
      }
    }
    // 只有图表靠近视口时才加载渲染器，首页、图谱及普通文章不承担图表初始化成本。
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void render();
      },
      { rootMargin: '300px' },
    );
    observer.observe(target);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [id, source]);

  const current = rendered?.source === source ? rendered : null;
  return (
    <figure className="article-diagram" ref={element}>
      <figcaption>
        <span>
          <Waypoints size={17} />
          {title}
        </span>
        <span className="diagram-kind">{getDiagramKind(source)}</span>
      </figcaption>
      {current?.svg ? (
        <div
          className="diagram-canvas"
          role="img"
          aria-label={title}
          tabIndex={0}
          style={{ '--diagram-min-width': `${current.minimumWidth}px` } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : (
        <div className="diagram-placeholder" role="status">
          {current?.error ? '这段图表暂时无法绘制，请检查下面的源码。' : '正在整理图表…'}
        </div>
      )}
      <div className="diagram-scroll-hint">宽图可左右滑动查看</div>
      <details className="diagram-source" open={current?.error || undefined}>
        <summary>查看图表源码</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  );
}
