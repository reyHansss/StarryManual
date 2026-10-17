'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ArrowDown, Check, Clock3, X } from 'lucide-react';

export function InputBufferDemo() {
  const [windowMs, setWindowMs] = useState(280);
  const [pressAt, setPressAt] = useState(220);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const startTime = useRef(0);
  const readyAt = 400;
  const consumedAt = Math.max(readyAt, pressAt);
  const succeeds = consumedAt - pressAt <= windowMs;
  const hasInput = time >= pressAt;
  const consumed = succeeds && time >= consumedAt;
  const expired = !succeeds && time > pressAt + windowMs;
  const state = consumed
    ? '缓冲已消费'
    : expired
      ? '输入已过期'
      : hasInput
        ? '等待执行窗口'
        : running
          ? '等待按下攻击键'
          : '准备播放';
  useEffect(() => {
    if (!running) return;
    let frame: number;
    startTime.current = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(Math.round((now - startTime.current) / 2.2), 800);
      setTime(elapsed);
      if (elapsed < 800) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  const clear = () => {
    setRunning(false);
    setTime(0);
  };
  const preset = (nextWindow: number, nextPress: number) => {
    clear();
    setWindowMs(nextWindow);
    setPressAt(nextPress);
  };
  return (
    <section className="input-demo not-prose" aria-label="输入缓冲交互实验">
      <div className="demo-topline">
        <span className="eyebrow">
          <i className="status-dot" /> INPUT BUFFER
        </span>
        <span className="pill">浏览器机制示意</span>
      </div>
      <div className="demo-parameters">
        <label>
          缓冲有效期{' '}
          <strong>
            {windowMs} <small>ms</small>
          </strong>
          <input
            type="range"
            aria-label="缓冲有效期"
            min="80"
            max="500"
            step="20"
            value={windowMs}
            disabled={running}
            onChange={(event) => {
              clear();
              setWindowMs(Number(event.target.value));
            }}
          />
          <span>
            80 ms <span>500 ms</span>
          </span>
        </label>
        <label>
          按下攻击键的时刻{' '}
          <strong>
            {pressAt} <small>ms</small>
          </strong>
          <input
            type="range"
            aria-label="按下攻击键的时刻"
            min="80"
            max="600"
            step="20"
            value={pressAt}
            disabled={running}
            onChange={(event) => {
              clear();
              setPressAt(Number(event.target.value));
            }}
          />
          <span>
            80 ms <span>600 ms</span>
          </span>
        </label>
      </div>
      <div className="timeline-wrap">
        <div className="timeline-top">
          <span>动作时间线</span>
          <strong>
            {time.toString().padStart(3, '0')} <small>/ 800 ms</small>
          </strong>
        </div>
        <div className="timeline">
          <div className="timeline-track">
            <span className="locked-phase">前摇 / 无法执行</span>
            <span className="ready-phase">可以执行下个动作</span>
          </div>
          <div
            className={`buffer-window ${expired ? 'expired' : ''}`}
            style={{ left: `${pressAt / 8}%`, width: `${Math.min(windowMs, 800 - pressAt) / 8}%` }}
          >
            缓冲有效期
          </div>
          <div className="input-marker" style={{ left: `${pressAt / 8}%` }}>
            <ArrowDown size={15} />
            <span>输入 {pressAt} ms</span>
          </div>
          <div className="ready-marker">
            <span>窗口开启 400 ms</span>
          </div>
          <div className="playhead-track" aria-hidden="true">
            <div className="playhead" style={{ transform: `translateX(${time / 8}%)` }}>
              <i />
            </div>
          </div>
        </div>
        <div className="timeline-axis">
          <span>0</span>
          <span>200</span>
          <span>400</span>
          <span>600</span>
          <span>800 ms</span>
        </div>
      </div>
      <div
        className="demo-state"
        data-result={consumed ? 'consumed' : expired ? 'expired' : 'pending'}
        aria-live="polite"
      >
        <span className={`result-icon ${expired ? 'bad' : ''}`}>
          <Clock3 size={20} className="result-pending" aria-hidden="true" />
          <Check size={20} className="result-consumed" aria-hidden="true" />
          <X size={20} className="result-expired" aria-hidden="true" />
        </span>
        <div>
          <strong>{state}</strong>
          <p>
            {consumed
              ? `输入等待 ${consumedAt - pressAt} ms，在有效期内执行。`
              : expired
                ? `需要等待 ${readyAt - pressAt} ms，超过 ${windowMs} ms 的有效期。`
                : '拖动参数，再播放一次，观察输入何时保留、何时失效。'}
          </p>
        </div>
      </div>
      <div className="demo-controls">
        <button
          className="button primary"
          disabled={running}
          onClick={() => {
            setTime(0);
            setRunning(true);
          }}
        >
          <Play size={15} />
          {running ? '播放中…' : '播放一次'}
        </button>
        <button className="icon-button" onClick={clear} aria-label="重置播放">
          <RotateCcw size={17} />
        </button>
        <div className="presets">
          <span>试试看</span>
          <button disabled={running} onClick={() => preset(280, 220)}>
            来得及
          </button>
          <button disabled={running} onClick={() => preset(80, 220)}>
            已过期
          </button>
        </div>
      </div>
    </section>
  );
}
