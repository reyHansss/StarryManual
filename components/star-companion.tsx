/** 手册的装饰性星星向导，使用矢量图形保持各尺寸下的清晰度，不承载操作或正文。 */
export function StarCompanion() {
  return (
    <svg className="star-companion" viewBox="0 0 180 180" fill="none" aria-hidden="true">
      <ellipse
        cx="88"
        cy="89"
        rx="76"
        ry="58"
        transform="rotate(-23 88 89)"
        stroke="#BBC7E4"
        strokeWidth="2"
        strokeDasharray="4 8"
      />
      <path d="M23 48l4-12 5 12 12 4-12 5-5 12-4-12-12-5 12-4Z" fill="#A4BDE0" />
      <path d="m151 112 3-9 4 9 9 4-9 3-4 9-3-9-9-3 9-4Z" fill="#DDAAC7" />
      <path
        d="m54 123-8 22 27-8m39-13 10 21-28-9"
        fill="#9EAFD2"
        stroke="#657797"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m87 26 18 28 33 6c7 1 9 9 4 14l-24 24 3 34c1 7-6 12-12 9l-30-15-31 13c-7 3-13-3-11-10l7-33-22-26c-5-5-1-13 6-13l34-3 21-26c4-5 10-6 14-2Z"
        fill="#E5DDF4"
        stroke="#65708E"
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
      <path d="M74 101c4 5 9 5 13 0" stroke="#65708E" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="53" cy="99" rx="9" ry="4.5" fill="#DDAAC7" opacity="0.8" />
      <ellipse cx="109" cy="99" rx="9" ry="4.5" fill="#DDAAC7" opacity="0.8" />
      <path
        d="M51 132c16-7 28-6 39 2 12-8 26-9 40-3l-3 27c-14-5-26-3-37 3-11-7-24-8-38-3l-1-26Z"
        fill="#F6F7FC"
        stroke="#65708E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M90 135v25m-28-20 15 1m27-1 14-2m-55 9 12 1m30-1 11-2"
        stroke="#AFBCDD"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="m138 30 3-8m7 16 8-2" stroke="#9B8BB7" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
