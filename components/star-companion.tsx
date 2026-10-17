'use client';

import { useEffect, useId, useRef, useState } from 'react';

/** 手册的装饰性星星向导，使用矢量图形保持各尺寸下的清晰度，不承载操作或正文。 */
export function StarCompanion() {
  const element = useRef<SVGSVGElement>(null);
  const gradient = `companion-${useId().replace(/:/g, '')}`;
  const [active, setActive] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => setActive(visible && !document.hidden && !preference.matches);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        update();
      },
      { threshold: 0.5 },
    );
    // 欢迎动作只在星星可见时播放；离开视口、切到后台或减少动态效果时暂停。
    observer.observe(element.current!);
    document.addEventListener('visibilitychange', update);
    preference.addEventListener('change', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      preference.removeEventListener('change', update);
    };
  }, []);

  return (
    <svg
      ref={element}
      className="star-companion"
      data-motion={active ? 'running' : 'paused'}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="35"
          y1="30"
          x2="115"
          y2="140"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--companion-light)" />
          <stop offset="0.55" stopColor="var(--companion-gold)" />
          <stop offset="1" stopColor="var(--companion-shade)" />
        </linearGradient>
      </defs>
      <g className="companion-orbit">
        <ellipse
          cx="88"
          cy="89"
          rx="76"
          ry="58"
          transform="rotate(-23 88 89)"
          stroke="#c5b7e8"
          strokeWidth="2"
          strokeDasharray="4 8"
        />
      </g>
      <path
        className="companion-spark companion-spark-mint"
        d="M23 48l4-12 5 12 12 4-12 5-5 12-4-12-12-5 12-4Z"
        fill="#85c9c3"
      />
      <path
        className="companion-spark companion-spark-pink"
        d="m151 112 3-9 4 9 9 4-9 3-4 9-3-9-9-3 9-4Z"
        fill="#e9a5c7"
      />
      <path
        d="m54 123-8 22 27-8m39-13 10 21-28-9"
        fill="var(--companion-shade)"
        stroke="var(--companion-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m87 26 18 28 33 6c7 1 9 9 4 14l-24 24 3 34c1 7-6 12-12 9l-30-15-31 13c-7 3-13-3-11-10l7-33-22-26c-5-5-1-13 6-13l34-3 21-26c4-5 10-6 14-2Z"
        fill={`url(#${gradient})`}
        stroke="var(--companion-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="m85 42 10 15m-54 7 22-2" stroke="#FBFAFF" strokeWidth="5" strokeLinecap="round" />
      <g className="companion-eyes">
        <ellipse cx="65" cy="86" rx="5.5" ry="9" fill="#596481" />
        <ellipse cx="97" cy="86" rx="5.5" ry="9" fill="#596481" />
        <circle cx="66.5" cy="82" r="2.2" fill="#F8FAFF" />
        <circle cx="98.5" cy="82" r="2.2" fill="#F8FAFF" />
        <path d="m63 90 4 0m28 0 4 0" stroke="#9CAFD7" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path
        d="M74 101c4 5 9 5 13 0"
        stroke="var(--companion-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="53" cy="99" rx="9" ry="4.5" fill="#e8a1c1" opacity="0.8" />
      <ellipse cx="109" cy="99" rx="9" ry="4.5" fill="#e8a1c1" opacity="0.8" />
      <path
        d="M51 132c16-7 28-6 39 2 12-8 26-9 40-3l-3 27c-14-5-26-3-37 3-11-7-24-8-38-3l-1-26Z"
        fill="#ffffff"
        stroke="var(--companion-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M90 135v25m-28-20 15 1m27-1 14-2m-55 9 12 1m30-1 11-2"
        stroke="#AFBCDD"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        className="companion-spark companion-spark-lines"
        d="m138 30 3-8m7 16 8-2"
        stroke="#b399d8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
