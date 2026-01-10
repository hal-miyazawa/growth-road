import { useEffect, useRef, useState } from "react";
import styles from "./Sidebar.module.scss";
import type { ID, Label } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;

  labels: Label[];
  selectedLabelId: ID | null; // null = 全部表示
  onSelectLabel: (id: ID | null) => void;

  onOpenHistory?: () => void;

  /**
   * ★変更：ラベル名を受け取って親（Dashboard）で labels に追加する
   * - Sidebar は「入力→確定」まで担当
   * - 実際の labels 更新は親がやる（DB/APIにも繋げやすい）
   */
  onAddLabel: (name: string) => void;
};

export default function Sidebar({
  open,
  onClose,
  labels,
  selectedLabelId,
  onSelectLabel,
  onOpenHistory,
  onAddLabel,
}: Props) {
  // 追加モード（ラベル追加行が input に変形）
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ★追加：入力中は強制的にexpanded扱い
  const expanded = open || adding;

  // 追加モードになったらフォーカス
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commit = () => {
    const name = draft.trim();
    setAdding(false);
    setDraft("");

    if (!name) return; // 空なら何もしない（=キャンセル）
    onAddLabel(name);
  };

  const cancel = () => {
    setAdding(false);
    setDraft("");
  };

  return (
    <>
      {expanded && (
        <div
          className={styles.backdrop}
          onClick={() => {
            // 入力中ならキャンセルしてから閉じる
            setAdding(false);
            setDraft("");
            onClose();
          }}
        />
      )}

      <aside
        className={`${styles.sidebar} ${
          expanded ? styles.expanded : styles.collapsed
        }`}
      >
        <nav className={styles.nav}>
          {/* 総合（固定） */}
          <button
            type="button"
            className={`${styles.item} ${
              selectedLabelId === null ? styles.active : ""
            }`}
            onClick={() => {
              onSelectLabel(null);
              onClose();
            }}
          >
            <span className={styles.icon}>▦</span>
            <span className={styles.label}>総合</span>
          </button>

          {/* ラベル一覧 */}
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`${styles.item} ${
                selectedLabelId === l.id ? styles.active : ""
              }`}
              onClick={() => {
                onSelectLabel(l.id);
                onClose();
              }}
            >
              <span className={styles.icon}>
              <span
                className={styles.colorChip}
                style={{ backgroundColor: l.color ?? "#BDBDBD" }}
                aria-hidden="true"
              />
            </span>
              <span className={styles.label}>{l.name}</span>
            </button>
          ))}

          {/* ★ラベル追加（末尾）：クリックで input に変形 */}
          {!adding ? (
            <button
              type="button"
              className={styles.item}
              onClick={() => setAdding(true)}
            >
              <span className={styles.icon}>＋</span>
              <span className={styles.label}>ラベル追加</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.item}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.icon}>＋</span>

              <input
                ref={inputRef}
                className={styles.inlineInput}
                value={draft}
                placeholder="新しいラベル名"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") cancel();
                }}
                // ★ここ重要：クリックでblur→commit事故を防ぐ
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => commit()} // フォーカス外れで保存（空ならキャンセル）
              />
            </button>
          )}

          {/* 履歴（固定） */}
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onOpenHistory?.();
              onClose();
            }}
          >
            <span className={styles.icon}>↩︎</span>
            <span className={styles.label}>履歴</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
