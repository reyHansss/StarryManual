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
        const palette = [
          ['--diagram-pink', '--coral'],
          ['--diagram-blue', '--blue'],
          ['--diagram-peach', '--peach'],
          ['--diagram-mint', '--success'],
        ].map(([fill, border]) => ({ fill: color(fill), border: color(border) }));
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          // 原生多色主题处理分组与参与者，保持时序图中同一参与者的颜色一致。
          theme: 'redux-color',
          look: 'classic',
          htmlLabels: false,
          fontFamily: color('--font-sans'),
          themeVariables: {
            fontFamily: color('--font-sans'),
            fontSize: '16px',
            background: color('--surface'),
            nodeShadow: false,
            THEME_COLOR_LIMIT: palette.length,
            bkgColorArray: palette.map(({ fill }) => fill),
            borderColorArray: palette.map(({ border }) => border),
            primaryColor: color('--accent-soft'),
            primaryTextColor: color('--text'),
            primaryBorderColor: color('--accent'),
            secondaryColor: color('--peach-soft'),
            secondaryTextColor: color('--text'),
            secondaryBorderColor: color('--peach'),
            tertiaryColor: color('--blue-soft'),
            tertiaryTextColor: color('--text'),
            tertiaryBorderColor: color('--blue'),
            lineColor: color('--muted'),
            arrowheadColor: color('--muted'),
            textColor: color('--text'),
            nodeTextColor: color('--text'),
            titleColor: color('--text'),
            classText: color('--text'),
            mainBkg: color('--accent-soft'),
            nodeBorder: color('--accent'),
            stateBorder: color('--accent'),
            stateLabelColor: color('--text'),
            transitionLabelColor: color('--text'),
            clusterBkg: color('--surface-soft'),
            clusterBorder: color('--border'),
            edgeLabelBackground: color('--surface'),
            actorBkg: color('--accent-soft'),
            actorBorder: color('--accent'),
            actorTextColor: color('--text'),
            signalColor: color('--muted'),
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
        const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
        // Mermaid 的普通流程与状态节点没有原生色组；只补默认轮廓，不触及文字、连线或起止符号。
        // 原生色组和作者的显式样式优先，避免自动配色覆盖图表原有语义。
        let tone = 0;
        svg.querySelectorAll('.node:not([data-color-id])').forEach((node) => {
          const shapes = Array.from(node.querySelectorAll<SVGElement>(':scope > .label-container'));
          if (!shapes.length || shapes.some((shape) => shape.style.fill || shape.style.stroke))
            return;
          const { fill, border } = palette[tone++ % palette.length];
          shapes.forEach((shape) => {
            shape.style.fill = fill;
            shape.style.stroke = border;
          });
        });
        const viewBox = svg.documentElement.getAttribute('viewBox')?.split(/\s+/).map(Number);
        const size = { width: viewBox?.[2] || 580, height: viewBox?.[3] || 320 };
        if (!disposed)
          setRendered({
            source,
            svg: new XMLSerializer().serializeToString(svg.documentElement),
            size,
            error: false,
          });
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
