'use client';

import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Waypoints } from 'lucide-react';
import { getDiagramKind, type DiagramSize, type DiagramView } from '@/lib/diagram';

const DiagramViewport = dynamic(() =>
  import('./diagram-viewport').then((module) => module.DiagramViewport),
);

/** 文章只提供关系文本；自动布局、字体和配色统一复用手册主题。 */
export function Diagram({ title, source }: { title: string; source: string }) {
  const element = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const inline = useRef<HTMLDivElement>(null);
  const inlineView = useRef<DiagramView | null>(null);
  const [inlineHeight, setInlineHeight] = useState<number>();
  const [expanded, setExpanded] = useState(false);
  const id = `diagram-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const [rendered, setRendered] = useState<{
    source: string;
    svg: string;
    size: DiagramSize;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    const target = element.current!;
    inlineView.current = null;
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
            secondaryColor: color('--peach-soft'),
            secondaryTextColor: color('--text'),
            secondaryBorderColor: color('--peach'),
            tertiaryColor: color('--blue-soft'),
            tertiaryTextColor: color('--text'),
            tertiaryBorderColor: color('--blue'),
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
            noteBkgColor: color('--peach-soft'),
            noteBorderColor: color('--peach'),
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
        const size = { width: viewBox?.[2] || 580, height: viewBox?.[3] || 320 };
        if (!disposed) setRendered({ source, svg: result.svg, size, error: false });
      } catch {
        if (!disposed)
          setRendered({ source, svg: '', size: { width: 580, height: 320 }, error: true });
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

  useEffect(() => {
    if (!expanded) return;
    const target = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 原生对话框提供焦点约束和 Esc 退出，手机也不依赖浏览器 Fullscreen API。
    target.showModal();
    return () => {
      target.close();
      document.body.style.overflow = previousOverflow;
      element.current
        ?.querySelector<HTMLButtonElement>('[data-diagram-expand]')
        ?.focus({ preventScroll: true });
    };
  }, [expanded]);

  const current = rendered?.source === source ? rendered : null;
  const viewer = current?.svg ? (
    <DiagramViewport
      key={source}
      title={title}
      svg={current.svg}
      size={current.size}
      expanded={expanded}
      toggleExpanded={() => {
        if (!expanded) setInlineHeight(inline.current?.getBoundingClientRect().height);
        setExpanded(!expanded);
      }}
      savedView={expanded ? null : inlineView.current}
      rememberView={
        expanded
          ? undefined
          : (view) => {
              inlineView.current = view;
            }
      }
    />
  ) : (
    <div className="diagram-placeholder" role="status">
      {current?.error ? '这段图表暂时无法绘制，请检查下面的源码。' : '正在整理图表…'}
    </div>
  );
  return (
    <figure className="article-diagram" ref={element}>
      <figcaption>
        <span>
          <Waypoints size={17} />
          {title}
        </span>
        <span className="diagram-kind">{getDiagramKind(source)}</span>
      </figcaption>
      <div ref={inline} style={{ height: expanded ? inlineHeight : undefined }}>
        {expanded ? null : viewer}
      </div>
      <dialog
        ref={dialog}
        className="diagram-dialog"
        aria-labelledby={`${id}-expanded-title`}
        onCancel={(event) => {
          event.preventDefault();
          setExpanded(false);
        }}
        onClose={() => setExpanded(false)}
      >
        <div className="diagram-dialog-title" id={`${id}-expanded-title`}>
          <Waypoints size={18} />
          {title}
        </div>
        {expanded ? viewer : null}
      </dialog>
      <details className="diagram-source" open={current?.error || undefined}>
        <summary>查看图表源码</summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  );
}
