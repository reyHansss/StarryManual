import { ImageIcon } from 'lucide-react';
import { assetUrl } from '@/lib/site-config';

/**
 * 正文截图：`src` 为 `public` 下的站内路径（例如 `/images/stellautilityai/stack-editor.png`），
 * `title` 同时作为图注与替代文字。点击图片在新标签页打开原图，静态发布时自动补上部署路径。
 */
export function Screenshot({ src, title }: { src: string; title: string }) {
  const url = assetUrl(src);
  return (
    <figure className="article-screenshot not-prose">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}（在新标签页查看原图）`}
      >
        {/* 静态导出不经过图片优化，直接使用原图并延迟加载。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} loading="lazy" decoding="async" />
      </a>
      <figcaption>
        <ImageIcon size={15} aria-hidden="true" />
        {title}
      </figcaption>
    </figure>
  );
}
