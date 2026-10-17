'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { type NavigationEntry } from '@/lib/navigation';

function SectionItems({
  entries,
  current,
  onChange,
  onBrowse,
}: {
  entries: NavigationEntry[];
  current: string[];
  onChange: (path: string[]) => void;
  onBrowse?: (path: string[]) => void;
}) {
  return entries
    .filter((entry) => entry.kind === 'section')
    .map((entry) => {
      const selected = JSON.stringify(current) === JSON.stringify(entry.path);
      const active = entry.path.every((label, index) => current[index] === label);
      const hasChildren = entry.entries.some((child) => child.kind === 'section');
      if (!hasChildren) {
        return (
          <Dropdown.Item
            key={JSON.stringify(entry.path)}
            className="graph-menu-item"
            onSelect={() => onChange(entry.path)}
            data-current={selected || undefined}
          >
            <span>{entry.label}</span>
            {selected && <Check size={14} />}
          </Dropdown.Item>
        );
      }
      if (onBrowse) {
        return (
          <Dropdown.Item
            key={JSON.stringify(entry.path)}
            className="graph-menu-item"
            data-current={active || undefined}
            onSelect={(event) => {
              event.preventDefault();
              onBrowse(entry.path);
            }}
          >
            <span>{entry.label}</span>
            <ChevronRight size={14} />
          </Dropdown.Item>
        );
      }
      return (
        <Dropdown.Sub key={JSON.stringify(entry.path)}>
          <Dropdown.SubTrigger className="graph-menu-item" data-current={active || undefined}>
            <span>{entry.label}</span>
            <ChevronRight size={14} />
          </Dropdown.SubTrigger>
          <Dropdown.Portal>
            <Dropdown.SubContent
              className="graph-section-menu"
              sideOffset={5}
              collisionPadding={12}
              loop
              aria-label={`${entry.label}的子分区`}
            >
              <Dropdown.Item
                className="graph-menu-item"
                onSelect={() => onChange(entry.path)}
                data-current={selected || undefined}
              >
                <span>全部{entry.label}</span>
                {selected && <Check size={14} />}
              </Dropdown.Item>
              <Dropdown.Separator className="graph-menu-separator" />
              <SectionItems entries={entry.entries} current={current} onChange={onChange} />
            </Dropdown.SubContent>
          </Dropdown.Portal>
        </Dropdown.Sub>
      );
    });
}

export function GraphSectionPicker({
  entries,
  current,
  onChange,
}: {
  entries: NavigationEntry[];
  current: string[];
  onChange: (path: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [browsePath, setBrowsePath] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (narrow && open) panelRef.current?.focus();
  }, [narrow, open, browsePath]);
  // 窄屏在同一面板逐级浏览，避免多列子菜单挤出视口；选择仍保存完整功能路径。
  const panelPath = narrow ? browsePath : [];
  let panelEntries = entries;
  for (const label of panelPath) {
    const entry = panelEntries.find((entry) => entry.kind === 'section' && entry.label === label);
    if (entry?.kind === 'section') panelEntries = entry.entries;
  }
  const selectedPanel = JSON.stringify(current) === JSON.stringify(panelPath);
  const label = current.at(-1) ?? '全部功能';
  return (
    <Dropdown.Root
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setBrowsePath([]);
      }}
    >
      <Dropdown.Trigger asChild>
        <button
          className="graph-picker-trigger"
          aria-label={`选择功能分区：${label}`}
          title={current.length ? current.join(' / ') : undefined}
        >
          <span className="graph-picker-label">分区</span>
          <span>{label}</span>
          <ChevronDown size={14} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          ref={panelRef}
          className="graph-section-menu"
          sideOffset={8}
          collisionPadding={12}
          align="start"
          loop
          aria-label="功能分区"
        >
          {panelPath.length > 0 && (
            <>
              <Dropdown.Item
                className="graph-menu-item"
                onSelect={(event) => {
                  event.preventDefault();
                  setBrowsePath(panelPath.slice(0, -1));
                }}
              >
                <ArrowLeft size={14} />
                <span>返回上一级</span>
              </Dropdown.Item>
              <Dropdown.Separator className="graph-menu-separator" />
            </>
          )}
          <Dropdown.Item
            className="graph-menu-item"
            onSelect={() => onChange(panelPath)}
            data-current={selectedPanel || undefined}
          >
            <span>{panelPath.length ? `全部${panelPath.at(-1)}` : '全部功能'}</span>
            {selectedPanel && <Check size={14} />}
          </Dropdown.Item>
          <Dropdown.Separator className="graph-menu-separator" />
          <SectionItems
            entries={panelEntries}
            current={current}
            onChange={onChange}
            onBrowse={narrow ? setBrowsePath : undefined}
          />
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
