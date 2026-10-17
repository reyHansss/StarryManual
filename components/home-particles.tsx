'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { assetUrl } from '@/lib/site-config';
import {
  createBackgroundScene,
  createPortraitScene,
  type ParticlePointer,
  type ParticleScene,
} from '@/lib/home-particles';

const HomeMotionContext = createContext({ enabled: true, toggle: () => {} });
const portraitSource = assetUrl('/images/home-portrait.png');

/** 暂停开关同时控制首页主体与背景，离开首页后不挂载任何粒子画布或监听。 */
export function HomeMotion({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  return (
    <HomeMotionContext.Provider value={{ enabled, toggle: () => setEnabled((value) => !value) }}>
      {children}
    </HomeMotionContext.Provider>
  );
}

function useParticleCanvas(kind: 'portrait' | 'background') {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enabled } = useContext(HomeMotionContext);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scope = canvas.closest(kind === 'portrait' ? '.particle-portrait' : '.home-main')!;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer: ParticlePointer = { x: 0, y: 0, active: false, speed: 0 };
    let scene: ParticleScene | undefined;
    let disposed = false;
    let visible = false;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let pointerTime = 0;
    let touchTimer: ReturnType<typeof setTimeout> | undefined;
    const animated = () => enabled && !preference.matches;
    const allowed = () => visible && !document.hidden;

    function draw(now: number) {
      frame = 0;
      if (!scene || !allowed()) return;
      const milliseconds = previous ? now - previous : 1000 / 60;
      // 将装饰动画限制在 60 fps，后台恢复时重置时间基线，避免大步积分。
      if (previous && milliseconds < 1000 / 60 - 1) {
        frame = requestAnimationFrame(draw);
        return;
      }
      previous = now;
      const delta = Math.min(milliseconds / 1000, 1 / 30);
      elapsed += delta;
      pointer.speed *= Math.exp(-delta * 7);
      scene.draw(elapsed, delta, pointer, animated());
      canvas.dataset.motion = animated() ? 'running' : 'paused';
      if (animated()) frame = requestAnimationFrame(draw);
    }

    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (allowed() && scene) frame = requestAnimationFrame(draw);
      else canvas.dataset.motion = 'suspended';
    }

    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      scene?.resize(width, height);
      sync();
    }

    function move(event: Event) {
      const input = event as PointerEvent;
      if (input.pointerType === 'touch' && input.type !== 'pointerdown') return;
      const rect = canvas.getBoundingClientRect();
      const x = input.clientX - rect.left;
      const y = input.clientY - rect.top;
      const now = performance.now();
      const seconds = Math.max((now - pointerTime) / 1000, 0.016);
      pointer.speed = pointer.active
        ? Math.min(1000, Math.hypot(x - pointer.x, y - pointer.y) / seconds)
        : 0;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointerTime = now;
      // 触摸只在点按时短暂拨动，不阻止页面滚动，也不要求悬停或右键。
      if (input.pointerType === 'touch') {
        clearTimeout(touchTimer);
        touchTimer = setTimeout(leave, 240);
      }
    }

    function leave() {
      pointer.active = false;
      pointer.speed = 0;
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const sizeObserver = new ResizeObserver(resize);
    visibility.observe(canvas);
    sizeObserver.observe(canvas);
    scope.addEventListener('pointermove', move, { passive: true });
    scope.addEventListener('pointerdown', move, { passive: true });
    scope.addEventListener('pointerleave', leave);
    scope.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    const ready =
      kind === 'portrait'
        ? createPortraitScene(context, portraitSource)
        : Promise.resolve(createBackgroundScene(context));
    ready
      .then((created) => {
        if (disposed) return;
        scene = created;
        canvas.dataset.ready = 'true';
        resize();
      })
      .catch(() => {
        if (disposed) return;
        // 图片或画布不可用时保留原图；装饰失败不影响阅读、导航与静态导出。
        canvas.dataset.ready = 'false';
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(touchTimer);
      visibility.disconnect();
      sizeObserver.disconnect();
      scope.removeEventListener('pointermove', move);
      scope.removeEventListener('pointerdown', move);
      scope.removeEventListener('pointerleave', leave);
      scope.removeEventListener('pointercancel', leave);
      window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
    };
  }, [kind, enabled]);

  return canvasRef;
}

export function HomeParticleBackground() {
  const canvas = useParticleCanvas('background');
  return <canvas ref={canvas} className="home-particle-background" aria-hidden="true" />;
}

export function ParticlePortrait() {
  const canvas = useParticleCanvas('portrait');
  const { enabled, toggle } = useContext(HomeMotionContext);
  return (
    <>
      <div className="particle-portrait">
        <img src={portraitSource} alt="白发角色插画，使用彩色粒子呈现" width={1024} height={1024} />
        <canvas ref={canvas} aria-hidden="true" />
        <span className="portrait-corner portrait-corner-top" aria-hidden="true" />
        <span className="portrait-corner portrait-corner-bottom" aria-hidden="true" />
      </div>
      <div className="hero-particle-footer">
        <span>移动鼠标或轻触，拨动星屑</span>
        <button
          type="button"
          className="particle-motion-toggle"
          onClick={toggle}
          aria-pressed={!enabled}
        >
          {enabled ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
          {enabled ? '暂停动效' : '开启动效'}
        </button>
      </div>
    </>
  );
}
