import { useEffect, useState } from "react";
import styles from "./TaskModal.module.scss";

type Props = {
  open: boolean;         // 親が管理する「表示するか」
  onClose: () => void;   // 閉じる（背景/×/Esc）
  onSave?: () => void;
  onDelete?: () => void;
};

const ANIM_MS = 240;
type Phase = "opening" | "open" | "closing";

export default function TaskModal({ open, onClose, onSave, onDelete }: Props) {
  // mounted: closeアニメ中もDOMを残すためのフラグ
  const [mounted, setMounted] = useState(open);

  // phase: CSSアニメ用（data-phaseで見分ける）
  const [phase, setPhase] = useState<Phase>("open");

  // =========================
  // 表示/非表示 + アニメ制御
  // =========================
  useEffect(() => {
    if (open) {
      // ① まずDOMを出す → opening状態
      setMounted(true);
      setPhase("opening");

      // ② 次フレームで open にする（transitionを確実に発火させる）
      const raf = requestAnimationFrame(() => setPhase("open"));
      return () => cancelAnimationFrame(raf);
    }

    // close要求：closing → 少し待ってDOMを消す
    if (mounted) {
      setPhase("closing");
      const timer = window.setTimeout(() => setMounted(false), ANIM_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  // =========================
  // Escで閉じる
  // =========================
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  // DOMを消してよいタイミング
  if (!mounted) return null;

  // =========================
  // UI
  // =========================
  return (
    // 背景クリックで閉じる
    <div className={styles.backdrop} data-phase={phase} onClick={onClose}>
      {/* モーダル本体クリックは閉じない */}
      <div
        className={styles.modal}
        data-phase={phase}
        role="dialog"
        aria-modal="true"
        aria-label="タスク編集"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 上部 */}
        <div className={styles.topRow}>
          <button type="button" className={styles.labelBtn}>
            ラベル <span className={styles.caret}>▼</span>
          </button>

          <div className={styles.topRight}>
            <button type="button" className={styles.iconBtn} aria-label="ピン">
              📌
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="閉じる"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* タイトル */}
        <div className={styles.titleWrap}>
          <input
            className={styles.titleInput}
            placeholder="タスク"
            defaultValue="タスク"
          />
        </div>

        {/* メモ */}
        <div className={styles.memoWrap}>
          <div className={styles.memoLabel}>メモ</div>
          <textarea className={styles.memoArea} />
        </div>

        {/* 操作 */}
        <div className={styles.actions}>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            削除
          </button>
          <button type="button" className={styles.saveBtn} onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
