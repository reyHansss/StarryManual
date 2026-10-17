'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BlueprintViewer } from './blueprint-viewer';
import styles from './blueprint-source-input.module.css';

function LayoutDialog({
  source,
  onApply,
  onClose,
}: {
  source: string;
  onApply: (text: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(source);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles.header}>
        <div>
          <h2 id={heading}>蓝图布局编辑</h2>
          <p>拖动节点调整排版；应用后，再保存文章。</p>
        </div>
        <button type="button" onClick={onClose}>
          取消
        </button>
      </div>
      <div className={styles.canvas}>
        <BlueprintViewer title="节点排版" source={draft} editable onSourceChange={setDraft} />
      </div>
      <div className={styles.actions}>
        <span>方向键微调 1 px，Shift + 方向键移动 16 px；接近同高引脚时自动吸附。</span>
        <button type="button" className={styles.primary} onClick={() => onApply(draft)}>
          应用到节点文本
        </button>
      </div>
    </dialog>
  );
}

/** 保持 Keystatic 原有字符串存储，只为同一字段增加可视化排版入口。 */
export function BlueprintSourceInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const fieldId = useId();
  const valid =
    value.trim().startsWith('Begin Object') &&
    value.includes('End Object') &&
    value.length <= 200000;
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>UE 节点文本</label>
      <p>粘贴从 UE 复制的完整节点；可视化编辑只调整位置，连线关系随原文本保存。</p>
      <textarea
        id={fieldId}
        value={value}
        autoFocus={autoFocus}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" disabled={!valid} onClick={() => setEditing(true)}>
        可视化编辑
      </button>
      {editing && (
        <LayoutDialog
          source={value}
          onClose={() => setEditing(false)}
          onApply={(next) => {
            onChange(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
