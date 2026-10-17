'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { isStaticExport } from '@/lib/site-config';

/** 本地静态预览也能进入同一份内容的网页编辑器；线上静态站不显示本机入口。 */
export function EditorLink({ slug, className }: { slug?: string; className?: string }) {
  const [localPreview, setLocalPreview] = useState(false);
  useEffect(() => {
    if (isStaticExport) {
      setLocalPreview(['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname));
    }
  }, []);

  if (isStaticExport && !localPreview) return null;
  const path = slug ? `/keystatic/collection/articles/item/${slug}` : '/keystatic';
  return (
    <a
      href={`${isStaticExport ? 'http://127.0.0.1:3210' : ''}${path}`}
      className={className}
      title="在本地网页编辑器中修改内容"
    >
      <Pencil size={14} />
      <span>{slug ? '编辑本页' : '编辑内容'}</span>
      <ArrowUpRight size={13} />
    </a>
  );
}
