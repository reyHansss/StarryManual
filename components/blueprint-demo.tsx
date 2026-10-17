'use client';

import { useRef, useState } from 'react';
import { Clipboard, Code2, RotateCcw, X } from 'lucide-react';

export function BlueprintDemo() {
  const [revision, setRevision] = useState(0);
  const [pasting, setPasting] = useState(false);
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const render = () => {
    if (text.length > 200000) {
      setStatus('当前示例最多接收 200 KB 节点文本。');
      return;
    }
    if (!text.trim().startsWith('Begin Object') || !text.includes('End Object')) {
      setStatus('请粘贴从 UE 复制的完整节点文本，以 Begin Object 开始。');
      return;
    }
    frame.current?.contentWindow?.postMessage(
      { type: 'starry-blueprint', text },
      window.location.origin,
    );
    setPasting(false);
    setCustom(true);
    setStatus('');
  };
  return (
    <section className="blueprint-demo not-prose" aria-label="UE 蓝图节点查看器">
      <div className="blueprint-toolbar">
        <span>
          <Code2 size={15} /> {custom ? '自定义节点文本' : 'Begin Play → Print String'}
          <i className="pill">{custom ? '本地文本' : '示例节点'}</i>
        </span>
        <div>
          <button onClick={() => setPasting(!pasting)} className="text-button">
            <Clipboard size={14} />
            粘贴节点
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setRevision(revision + 1);
              setPasting(false);
              setCustom(false);
            }}
            aria-label="恢复示例蓝图"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className="blueprint-stage">
        <iframe
          key={revision}
          ref={frame}
          src="/blueprint/viewer.html"
          title="可缩放的 UE 蓝图节点"
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
        <span>右键拖动平移 · Ctrl + 滚轮缩放</span>
      </div>
    </section>
  );
}
