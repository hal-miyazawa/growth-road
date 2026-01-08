import styles from "./ProjectModal.module.scss";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type TaskItem = {
  id: string;
  name: string;
};

const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());

export default function ProjectModal({ open, onClose }: Props) {
  const [projectName, setProjectName] = useState("プロジェクト名");

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: uid(), name: "タスク名" },
    { id: uid(), name: "タスク名" },
    { id: uid(), name: "タスク名" },
  ]);

  // Esc で閉じる（開いてる時だけ）
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);


  // ★ここが今回の主役：指定タスクの「下」に追加
  const addTaskAfter = (afterId: string) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === afterId);
      if (idx < 0) return prev;

      const next = [...prev];
      next.splice(idx + 1, 0, { id: uid(), name: "タスク名" }); // insert
      return next;
    });
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTask = (id: string, name: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
        <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="新規プロジェクト作成"
            onClick={(e) => e.stopPropagation()}
        >
            <div className={styles.modalInner}>
                {/* 上段 */}
            <div className={styles.topRow}>
            <button type="button" className={styles.labelBtn}>
                ラベル<span className={styles.caret}>▼</span>
            </button>

            <div className={styles.topRight}>
                <button type="button" className={styles.iconBtn} aria-label="ピン">
                📌
                </button>
                <button type="button" className={styles.iconBtn} aria-label="閉じる" onClick={onClose}>
                ✕
                </button>
            </div>
            </div>

            {/* プロジェクト名 */}
            <div className={styles.projectNameRow}>
            <input
                className={styles.projectNameInput}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
            />
            <div className={styles.projectUnderline} />
            </div>

            {/* タイムライン */}
            <div className={styles.timeline}>
            <div className={styles.dot} data-pos="start" aria-hidden />

            <div className={styles.list}>
                {tasks.map((t) => (
                <div key={t.id} className={styles.item}>
                    <div className={styles.taskCard}>
                    <input
                        className={styles.taskInput}
                        value={t.name}
                        onChange={(e) => updateTask(t.id, e.target.value)}
                        placeholder="タスク名"
                    />
                    </div>

                    {/* ★右側： ⋮ ＋ － */}
                    <div className={styles.itemRight}>
                    <button type="button" className={styles.moreBtn} aria-label="メニュー">
                        ⋮
                    </button>

                    <button
                        type="button"
                        className={styles.addInlineBtn}
                        aria-label="この下に追加"
                        onClick={() => addTaskAfter(t.id)}
                    >
                        +
                    </button>

                    <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label="削除"
                        onClick={() => removeTask(t.id)}
                    >
                        −
                    </button>
                    </div>
                </div>
                ))}
            </div>

            <div className={styles.dot} data-pos="end" aria-hidden />

            {/* 末尾追加も残したいなら（無い方が好みなら消してOK） */}
            {/* <button type="button" className={styles.addBtn} onClick={addTaskToEnd}>+</button> */}
            </div>

            <div className={styles.footer}>
            <button type="button" className={styles.saveBtn}>
                保存
            </button>
            </div>
            </div>
            
        </div>
    </div>
  );
}
