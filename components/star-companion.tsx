/** 手册的装饰性星星向导，使用矢量图形保持各尺寸下的清晰度，不承载操作或正文。 */
export function StarCompanion() {
  return (
    <svg className="star-companion" viewBox="0 0 180 180" fill="none" aria-hidden="true">
      <path d="M23 48l4-12 5 12 12 4-12 5-5 12-4-12-12-5 12-4Z" fill="#69C9DE" />
      <path d="m151 112 3-9 4 9 9 4-9 3-4 9-3-9-9-3 9-4Z" fill="#F29AAE" />
      <path d="m54 123-8 22 27-8m39-13 10 21-28-9" fill="#75B6EF" />
      <path
        d="m87 26 18 28 33 6c7 1 9 9 4 14l-24 24 3 34c1 7-6 12-12 9l-30-15-31 13c-7 3-13-3-11-10l7-33-22-26c-5-5-1-13 6-13l34-3 21-26c4-5 10-6 14-2Z"
        fill="#FFE18B"
        stroke="#33537F"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="m85 42 10 15m-54 7 22-2" stroke="#FFF9DC" strokeWidth="5" strokeLinecap="round" />
      <path d="M64 83v7m33-7v7" stroke="#33537F" strokeWidth="5" strokeLinecap="round" />
      <path d="M73 99c4 6 10 6 14 0" stroke="#33537F" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="55" cy="98" rx="8" ry="4" fill="#F5ADAF" />
      <ellipse cx="108" cy="98" rx="8" ry="4" fill="#F5ADAF" />
      <path
        d="M51 132c16-7 28-6 39 2 12-8 26-9 40-3l-3 27c-14-5-26-3-37 3-11-7-24-8-38-3l-1-26Z"
        fill="white"
        stroke="#33537F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M90 135v25m-28-20 15 1m27-1 14-2m-55 9 12 1m30-1 11-2"
        stroke="#A0C6EE"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="m138 30 3-8m7 16 8-2" stroke="#5985D5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
