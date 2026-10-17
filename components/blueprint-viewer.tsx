'use client';

import { useEffect, useRef, useState } from 'react';
import { Clipboard, Code2, Copy, Trash2, X } from 'lucide-react';
import { assetUrl } from '@/lib/site-config';

function showNodes(frame: HTMLIFrameElement | null, text: string, editable: boolean) {
  frame?.contentWindow?.postMessage(
    { type: 'starry-blueprint', text, editable },
    window.location.origin,
  );
}

export function BlueprintViewer({
  title,
  source,
  editable = source === undefined,
  onSourceChange,
}: {
  title?: string;
  source?: string;
  editable?: boolean;
  onSourceChange?: (text: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [pasting, setPasting] = useState(false);
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState('');
  const [nodes, setNodes] = useState('');
  const [status, setStatus] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const embedded = source !== undefined;
  const activeSource = source ?? nodes;
  useEffect(() => {
    showNodes(frame.current, activeSource, editable);
  }, [activeSource, editable]);
  useEffect(() => {
    if (!editable) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== 'starry-blueprint-change' ||
        typeof event.data.text !== 'string' ||
        event.data.text.length > 200000
      )
        return;
      if (embedded) onSourceChange?.(event.data.text);
      else setNodes(event.data.text);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [editable, embedded, onSourceChange]);
  const render = () => {
    if (text.length > 200000) {
      setStatus('最多接收 200,000 个字符的节点文本。');
      return;
    }
    if (!text.trim().startsWith('Begin Object') || !text.includes('End Object')) {
      setStatus('请粘贴从 UE 复制的完整节点文本，以 Begin Object 开始。');
      return;
    }
    setNodes(text);
    setPasting(false);
    setCustom(true);
    setStatus('');
  };
  return (
    <section className="blueprint-viewer not-prose" aria-label={title || 'UE 蓝图节点'}>
      <div className="blueprint-toolbar">
        <span>
          <Code2 size={15} /> {title || (custom ? '当前节点文本' : 'UE 蓝图节点')}
          <i className="pill">{editable ? '布局编辑' : '文档节点'}</i>
        </span>
        {!embedded && (
          <div>
            <button
              onClick={() => {
                if (!pasting) setText(activeSource);
                setPasting(!pasting);
              }}
              className="text-button"
            >
              <Clipboard size={14} />
              粘贴节点
            </button>
            <button
              className="icon-button"
              onClick={() => {
                setRevision(revision + 1);
                setPasting(false);
                setCustom(false);
                setText('');
                setNodes('');
                setStatus('');
              }}
              aria-label="清空蓝图画布"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {editable && activeSource && (
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(activeSource);
                setStatus('已复制当前排版的节点文本。');
              } catch {
                setStatus('复制未完成，请展开节点文本手动复制。');
              }
            }}
          >
            <Copy size={14} />
            复制节点文本
          </button>
        )}
      </div>
      <div className="blueprint-stage">
        <iframe
          key={revision}
          ref={frame}
          src={assetUrl('/blueprint/viewer.html')}
          title={title ? `${title} · 可缩放的 UE 蓝图节点` : '可缩放的 UE 蓝图节点'}
          onLoad={() => {
            showNodes(frame.current, activeSource, editable);
          }}
          sandbox="allow-scripts allow-same-origin"
        />
        {pasting && (
          <div className="blueprint-paste">
            <div>
              <strong>粘贴 UE 节点文本</strong>
              <button
                onClick={() => setPasting(false)}
                className="icon-button"
                aria-label="关闭粘贴窗口"
              >
                <X size={17} />
              </button>
            </div>
            <p>在 UE 蓝图编辑器中选中节点并复制，再粘贴到这里。</p>
            <textarea
              aria-label="UE 节点文本"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={'Begin Object Class=/Script/BlueprintGraph...\n...\nEnd Object'}
              spellCheck={false}
            />
            {status && <p role="alert">{status}</p>}
            <button onClick={render} className="button primary">
              在画布中显示
            </button>
            <small>文本在当前页面本地处理。</small>
          </div>
        )}
      </div>
      <div className="blueprint-footer">
        <span>
          <i className="status-dot" /> blueprintUE · 本地渲染
        </span>
        <span>
          {editable
            ? '拖节点调整位置 · 拖空白平移 · 滚轮缩放'
            : '左键拖动 · 滚轮缩放 · 触屏单指平移、双指缩放'}
        </span>
      </div>
      {status && !pasting && (
        <p className="blueprint-status" role="status">
          {status}
        </p>
      )}
      {activeSource && (
        <details className="diagram-source">
          <summary>查看节点文本</summary>
          <pre>
            <code>{activeSource}</code>
          </pre>
        </details>
      )}
    </section>
  );
}
