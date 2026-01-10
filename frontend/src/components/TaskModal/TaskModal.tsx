import { useEffect, useState } from "react";
import styles from "./TaskModal.module.scss";
import type { ID, Task, Label } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;

  // ★編集時のみ使う（渡さなければ削除ボタン出ない）
  onDelete?: (id: ID) => void;

  labels: Label[];

  // ★編集対象。null/undefined なら新規作成
  task?: Task | null;
};

const ANIM_MS = 240;
type Phase = "opening" | "open" | "closing";

const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const now = () => new Date().toISOString();

export default function TaskModal({
  open,
  onClose,
  onSave,
  onDelete,
  labels,
  task,
}: Props) {
  const isEdit = !!task;

  // mounted: closeアニメ中もDOMを残すためのフラグ
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<Phase>("open");

  // 入力
  const [title, setTitle] = useState("タスク");
  const [memo, setMemo] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState<ID | null>(null);

  // open のたびに初期化（新規 or 編集）
  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title ?? "タスク");
      setMemo(task.memo ?? "");
      setSelectedLabelId(task.label_id ?? null);
    } else {
      setTitle("タスク");
      setMemo("");
      setSelectedLabelId(null);
    }
  }, [open, task]);

  // 表示/非表示 + アニメ制御
  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase("opening");
      const raf = requestAnimationFrame(() => setPhase("open"));
      return () => cancelAnimationFrame(raf);
    }

    if (mounted) {
      setPhase("closing");
      const timer = window.setTimeout(() => setMounted(false), ANIM_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  // Escで閉じる
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  // 保存
  const handleSave = () => {
    const ts = now();
    const t = title.trim() || "タスク";
    const m = memo.trim() || null;

    // ★編集なら既存taskをベースに更新（project_id等を壊さない）
    const next: Task = task
      ? {
          ...task,
          title: t,
          memo: m,
          label_id: selectedLabelId,
          updated_at: ts,
        }
      : {
          id: uid() as ID,
          project_id: null, // 新規は単体タスク（今まで通り）
          label_id: selectedLabelId,
          parent_task_id: null,
          order_index: 0, // Dashboard側で付け替えOK
          title: t,
          memo: m,
          completed: false,
          completed_at: null,
          is_fixed: false,
          created_at: ts,
          updated_at: ts,
        };

    onSave(next);
    onClose();
  };

  // 削除
  const handleDelete = () => {
    if (!task) return;
    onDelete?.(task.id);
    onClose();
  };

  return (
    <div className={styles.backdrop} data-phase={phase} onClick={onClose}>
      <div
        className={styles.modal}
        data-phase={phase}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "タスク編集" : "タスク作成"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 上部 */}
        <div className={styles.topRow}>
          <select
            className={styles.labelSelect}
            value={selectedLabelId ?? ""}
            onChange={(e) =>
              setSelectedLabelId((e.target.value || null) as ID | null)
            }
          >
            <option value="">ラベル：なし</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <div className={styles.topRight}>
            {/* ピンはまだ未実装ならこのままでOK */}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* メモ */}
        <div className={styles.memoWrap}>
          <div className={styles.memoLabel}>メモ</div>
          <textarea
            className={styles.memoArea}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {/* 操作 */}
        <div className={styles.actions}>
          {isEdit && onDelete && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
            >
              削除
            </button>
          )}

          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
