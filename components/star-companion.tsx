'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useSiteMotion } from '@/components/particle-effects';

/** 以黄色星星为主题的 Q 版手册向导，矢量形象随标题缩放，不承载操作或正文。 */
export function StarCompanion() {
  const element = useRef<SVGSVGElement>(null);
  const gradient = `companion-${useId().replace(/:/g, '')}`;
  const [active, setActive] = useState(false);
  const { enabled } = useSiteMotion();

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
    // 欢迎动作只在向导可见时播放；离开视口、切到后台或减少动态效果时暂停。
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
      data-motion={active && enabled ? 'running' : 'paused'}
      viewBox="0 0 200 240"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradient}
          x1="76"
          y1="28"
          x2="126"
          y2="155"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--companion-light)" />
          <stop offset="0.55" stopColor="var(--companion-gold)" />
          <stop offset="1" stopColor="var(--companion-shade)" />
        </linearGradient>
        <linearGradient
          id={gradient + '-eyes'}
          x1="0"
          y1="81"
          x2="0"
          y2="107"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#795342" />
          <stop offset="0.6" stopColor="#ca9153" />
          <stop offset="1" stopColor="#f8d77e" />
        </linearGradient>
        <linearGradient
          id={gradient + '-dress'}
          x1="85"
          y1="148"
          x2="111"
          y2="210"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffafa" />
          <stop offset="1" stopColor="#f6d9dc" />
        </linearGradient>
      </defs>
      <ellipse cx="101" cy="226" rx="39" ry="4" fill="#d6aab5" opacity="0.16" />
      <g className="companion-orbit">
        <path
          className="companion-spark"
          d="m23 61 3-8 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="#91c7d3"
        />
        <path
          className="companion-spark companion-spark-pink"
          d="m170 115 3-8 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="#eea4aa"
        />
        <path
          className="companion-spark companion-spark-lines"
          d="m165 48 3-7m4 13 7-2m-146 123 3 5m7-7 4-2"
          stroke="#e7ba79"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <g stroke="#ad865b" strokeWidth="2.3" strokeLinejoin="round">
        <path
          d="M54 77c-18 12-15 33-18 51-2 11-9 21-4 27 3 4 9 1 12-3-1 9 6 14 13 6 1 8 11 8 15 0l7-53-25-28Z"
          fill={'url(#' + gradient + ')'}
        />
        <path
          d="M143 75c19 10 16 33 19 51 2 13 10 23 5 29-3 4-9 1-12-3 1 9-6 14-13 6-1 8-11 8-15 0l-7-52 23-31Z"
          fill={'url(#' + gradient + ')'}
        />
        <path
          d="M52 111c-4 15-1 27-8 36m100-35c5 14 1 28 10 36"
          stroke="#d9b268"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
      <g stroke="#b59085" strokeWidth="2" strokeLinejoin="round">
        <path d="m84 197 1 19 10 2 2-20m10 0 1 20 10-2 1-19" fill="#fffaf4" />
        <path
          d="M83 214c-4 1-6 7-3 9 4 3 15 3 16-1l-1-7-12-1Zm26 1-1 7c1 4 12 4 16 1 3-2 0-8-5-9l-10 1Z"
          fill="#eeb5bb"
        />
        <path d="m85 216 7 1m21 0 6-1" stroke="#fff7ec" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M77 146c-7 14-5 31-14 52 17 15 57 17 75 0-9-20-8-38-17-52H77Z"
          fill={'url(#' + gradient + '-dress)'}
        />
        <path
          d="m78 182-4 17m17-15-1 21m21-21 2 21m11-23 4 17"
          stroke="#e3b9bc"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M65 198c20 10 48 11 72 0" stroke="#fffaf3" strokeWidth="4" />
        <path d="m90 126-2 13 12 10 13-10-3-13" fill="#fff0e4" />
        <path d="m85 135-13 9 15 18 13-13 14 13 15-18-14-9-15 11-15-11Z" fill="#fffdf5" />
        <path
          d="m82 141 7 10m30-10-7 10"
          stroke="#e8c783"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="m100 146 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1 2-5Z"
          fill="#f7d875"
          stroke="#c19a5e"
          strokeWidth="1.6"
        />
      </g>
      <g
        className="companion-wave"
        stroke="#b59085"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M67 145c-8-1-13-8-16-16l-9 4c1 12 7 23 17 27" fill="#fff0e4" />
        <path
          d="M44 136c-5-5-9-12-9-17 0-3 3-4 5 0l2 3c-4-9-3-14 0-14 3 0 4 8 6 11-2-10 0-14 3-12 2 2 2 10 3 14 2-4 4-5 6-3 3 3-1 11-5 16l-11 2Z"
          fill="#fff0e4"
        />
        <path d="M65 141c-6-1-11 7-11 13 0 4 8 9 13 8l7-14-9-7Z" fill="#fffdf7" />
        <path d="m59 153 7 4" stroke="#e8c783" strokeWidth="2.5" />
      </g>
      <path
        d="M128 145c11 2 15 15 11 26l-10 3-7-21 6-8Z"
        fill="#fffdf7"
        stroke="#b59085"
        strokeWidth="2"
      />
      <g stroke="#bb9994" strokeWidth="2" strokeLinejoin="round">
        <path
          d="M76 164c9-3 18-2 25 3 8-5 17-6 26-3l-3 28c-8-3-16-2-23 3-7-5-15-6-24-3l-1-28Z"
          fill="#fffdf9"
        />
        <path
          d="M101 168v26m5-21 13-2m-35 1 11 2m12 4 11-2m-34 2 11 2"
          stroke="#c6b0ad"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M74 172c-8-2-9 4-5 8l7 3m49-10c8-3 11 3 7 7l-7 3"
          fill="#fff0e4"
          strokeLinecap="round"
        />
      </g>
      <ellipse cx="51" cy="89" rx="7" ry="10" fill="#ffeddf" stroke="#b59085" strokeWidth="2" />
      <ellipse cx="148" cy="89" rx="7" ry="10" fill="#ffeddf" stroke="#b59085" strokeWidth="2" />
      <path
        d="M51 71c-2 25 3 41 23 52 16 9 36 9 52-1 18-11 24-27 21-51-4-27-91-31-96 0Z"
        fill="#fff3e8"
        stroke="#b59085"
        strokeWidth="2.3"
      />
      <path
        d="M44 88c-8-26 4-53 34-60 11-3 18 1 24 0 31-11 61 23 50 58l-6 23c-1-21-5-36-14-52 0 13-4 22-12 26-3-7-9-19-16-26 0 17-6 25-16 30 1-13-3-24-7-29-4 16-13 24-23 29l-3 17c-6-4-9-8-11-16Z"
        fill={'url(#' + gradient + ')'}
        stroke="#ad865b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M55 59c5-16 17-22 29-23m30-1c12 2 23 12 27 21"
        stroke="#fffbea"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M64 79c5-3 10-3 15-1m39 0c5-2 10-2 15 1"
        stroke="#b99c73"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g className="companion-eyes">
        <path
          d="M66 89c4-7 15-9 21-1 5 7 1 19-9 19-10 0-14-9-12-18Zm47-1c6-8 17-6 21 1 2 9-2 18-12 18-10 0-14-12-9-19Z"
          fill="#fffcf7"
        />
        <ellipse cx="77.5" cy="94.5" rx="9.5" ry="13" fill={'url(#' + gradient + '-eyes)'} />
        <ellipse cx="122.5" cy="94.5" rx="9.5" ry="13" fill={'url(#' + gradient + '-eyes)'} />
        <ellipse cx="78" cy="93.5" rx="4.3" ry="8.5" fill="#765142" />
        <ellipse cx="122" cy="93.5" rx="4.3" ry="8.5" fill="#765142" />
        <path
          d="M64 87c6-7 17-8 24 0m24 0c7-8 18-7 24 0m-72 0-3-4m75 4 3-4"
          stroke="#70534d"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="80.5" cy="88" r="3.5" fill="white" />
        <circle cx="125" cy="88" r="3.5" fill="white" />
        <circle cx="73.5" cy="100" r="1.8" fill="#fff7cf" />
        <circle cx="118" cy="100" r="1.8" fill="#fff7cf" />
        <path
          d="M69 105c4 3 9 3 13 1m36 0c4 2 9 2 13-1"
          stroke="#b68b71"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <ellipse cx="62" cy="108" rx="9" ry="4" fill="#f1b5b4" opacity="0.65" />
      <ellipse cx="138" cy="108" rx="9" ry="4" fill="#f1b5b4" opacity="0.65" />
      <path
        d="m59 106-1 4m6-3-1 4m72-4-1 4m6-5-1 4"
        stroke="#df999b"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M94 114c4 2 8 2 12 0-1 8-9 8-12 0Z"
        fill="#df9a9b"
        stroke="#b77c7b"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="m143 33 5 11 12 1-9 8 3 12-11-6-11 6 2-12-9-8 13-1 5-11Z"
        fill="#ffe389"
        stroke="#b48d50"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="m141 45 2-4 2 5" stroke="#fffdf3" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="m44 119 10 4-7 6-3-10Zm19 0-9 4 7 6 2-10Z"
        fill="#efa9b4"
        stroke="#c1888b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="54" cy="124" r="3" fill="#ffe59b" />
    </svg>
  );
}
