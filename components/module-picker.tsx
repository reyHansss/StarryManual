'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Layers3, Search } from 'lucide-react';
import { articleModules, type ModuleKey } from '@/lib/navigation';

type ModuleChoice = { key: ModuleKey; count: number };

/** 阅读目录与关系图谱共用模块搜索菜单，只由已有模块数据生成。 */
export function ModulePicker({
  modules,
  current,
  onChange,
  includeAll = false,
}: {
  modules: ModuleChoice[];
  current: ModuleKey | 'all';
  onChange: (module: ModuleKey | 'all') => void;
  includeAll?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const label = current === 'all' ? '全部模块' : articleModules[current].shortLabel;
  const matches = modules.filter(({ key }) =>
    `${key} ${articleModules[key].label}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  function choose(module: ModuleKey | 'all') {
    onChange(module);
    setOpen(false);
  }
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery('');
      }}
    >
      <Popover.Trigger asChild>
        <button className="graph-picker-trigger" aria-label={`选择模块：${label}`}>
          <Layers3 size={15} />
          <span>{label}</span>
          <ChevronDown size={14} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="graph-module-menu"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          aria-label="选择模块"
        >
          <label className="graph-module-search">
            <Search size={15} />
            <input
              aria-label="搜索模块"
              placeholder="搜索模块名称…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="graph-module-list">
            {includeAll && (
              <button onClick={() => choose('all')} aria-pressed={current === 'all'}>
                <Layers3 size={14} />
                <span>全部模块</span>
                <small>{modules.length} 个模块</small>
                {current === 'all' && <Check size={14} />}
              </button>
            )}
            {matches.map(({ key, count }) => (
              <button key={key} onClick={() => choose(key)} aria-pressed={current === key}>
                <i style={{ background: articleModules[key].nodeColor }} />
                <span>{articleModules[key].shortLabel}</span>
                <small>{count} 篇</small>
                {current === key && <Check size={14} />}
              </button>
            ))}
            {!matches.length && <p className="graph-menu-empty">没有匹配的模块。</p>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ReadingModulePicker({
  modules,
  current,
}: {
  modules: (ModuleChoice & { url: string })[];
  current: ModuleKey;
}) {
  const router = useRouter();
  return (
    <div className="sidebar-module-picker">
      <ModulePicker
        modules={modules}
        current={current}
        onChange={(key) => {
          const module = modules.find((module) => module.key === key);
          if (module) router.push(module.url);
        }}
      />
    </div>
  );
}
