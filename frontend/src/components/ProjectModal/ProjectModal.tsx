import styles from "./ProjectModal.module.scss";
import { useEffect, useMemo, useState } from "react";
import type { ID, Project, Task } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;
    // ★追加：保存時に親へ渡す
  onSave: (project: Project, tasks: Task[]) => void;
};

const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const now = () => new Date().toISOString();

/**
 * ----------------------------------------
 * order_index を必ず 0..n-1 に整える（欠番/重複を絶対に作らない）
 * ----------------------------------------
 * - 同一(project_id, parent_task_id)内での順番が保証される前提。
 * - insert/remove/並び替えをしたあとに必ず通すと安全。
 */
function normalizeOrderIndex(list: Task[]): Task[] {
  // ここでは「モーダル内の1プロジェクト」「ルート階層のみ」を想定してるので
  // 単純に並び順＝配列順として 0..n-1 を振り直す。
  // ※将来 parent_task_id も扱うなら、(parent_task_idごと)に groupBy して採番する。
  return list.map((t, i) => ({
    ...t,
    order_index: i,
    updated_at: now(),
  }));
}

/**
 * 新規タスク（モーダル内）
 * - project_id は draftProject.id に合わせる
 * - parent_task_id は今は null（ルート階層）
 */
function createDraftTask(projectId: ID, title = "タスク名"): Task {
  const ts = now();
  return {
    id: uid(),
    project_id: projectId,
    label_id: null,
    parent_task_id: null,
    order_index: 0, // あとで normalize で整える
    title,
    memo: null,
    completed: false,
    completed_at: null,
    is_fixed: false,
    created_at: ts,
    updated_at: ts,
  };
}

export default function ProjectModal({ open, onClose, onSave }: Props) {
  /**
   * ----------------------------------------
   * draftProject（保存前の仮プロジェクト）
   * ----------------------------------------
   * - 本保存までは “モーダル内のローカル状態”
   * - 保存時に親（Dashboardなど）へ渡す想定
   */
  const [draftProject, setDraftProject] = useState<Project>(() => {
    const ts = now();
    return {
      id: uid(),
      name: "プロジェクト名",
      label_id: null,
      current_order_index: 0,
      created_at: ts,
      updated_at: ts,
    };
  });

  /**
   * ----------------------------------------
   * draftTasks（保存前の仮タスク）
   * ----------------------------------------
   * - DB前提の Task 形で持つ
   * - order_index は normalizeOrderIndex で必ず保証する
   */
  const [draftTasks, setDraftTasks] = useState<Task[]>(() => {
    const projectId = uid(); // 初期化時は一旦別IDを作り、直後に draftProject 側と揃える
    return normalizeOrderIndex([
      createDraftTask(projectId),
      createDraftTask(projectId),
      createDraftTask(projectId),
    ]);
  });

  /**
   * open になった瞬間に、draftProject.id と draftTasks.project_id を揃える。
   * （初期化関数の順序都合でIDがズレるのを防ぐ）
   */
  useEffect(() => {
    if (!open) return;

    // モーダルを開くたびに “新規作成状態にリセット” したいならここで初期化する
    const ts = now();
    const newProjectId = uid();
    const p: Project = {
      id: newProjectId,
      name: "プロジェクト名",
      label_id: null,
      current_order_index: 0,
      created_at: ts,
      updated_at: ts,
    };
    setDraftProject(p);

    setDraftTasks(
      normalizeOrderIndex([
        createDraftTask(newProjectId),
        createDraftTask(newProjectId),
        createDraftTask(newProjectId),
      ])
    );
  }, [open]);

  // Esc で閉じる（開いてる時だけ）
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  /**
   * ----------------------------------------
   * 追加（insert）：指定タスクの直下に新規タスクを挿入
   * ----------------------------------------
   * - insert → normalize で order_index を必ず整える
   */
  const addTaskAfter = (afterId: ID) => {
    setDraftTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === afterId);
      if (idx < 0) return prev;

      const next = [...prev];
      next.splice(idx + 1, 0, createDraftTask(draftProject.id));
      return normalizeOrderIndex(next);
    });
  };

  /**
   * 削除：削除後も normalize で 0..n-1 を維持
   * ※最低1件は残す、などのルールが必要ならここで制御
   */
  const removeTask = (id: ID) => {
    setDraftTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return normalizeOrderIndex(next.length ? next : [createDraftTask(draftProject.id)]);
    });
  };

  /** 更新：title を更新（DBカラム名に合わせる） */
  const updateTaskTitle = (id: ID, title: string) => {
    setDraftTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updated_at: now() } : t))
    );
  };

  /** プロジェクト名更新 */
  const updateProjectName = (name: string) => {
    setDraftProject((prev) => ({ ...prev, name, updated_at: now() }));
  };

  /**
   * 保存（いまはUI優先で未実装）
   * - 本来は draftProject と draftTasks を親へ渡して state に追加 → モーダル閉じる
   * - もしくは API に POST して DBへ保存
   */
  const handleSave = () => {
    onSave(draftProject, draftTasks);
    onClose();
  };

  // 右側の表示用：timelineに出すのは draftTasks
  const viewTasks = useMemo(() => draftTasks, [draftTasks]);

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
              value={draftProject.name}
              onChange={(e) => updateProjectName(e.target.value)}
            />
            <div className={styles.projectUnderline} />
          </div>

          {/* タイムライン */}
          <div className={styles.timeline}>
            <div className={styles.dot} data-pos="start" aria-hidden />

            <div className={styles.list}>
              {viewTasks.map((t) => (
                <div key={t.id} className={styles.item}>
                  <div className={styles.taskCard}>
                    <input
                      className={styles.taskInput}
                      value={t.title}
                      onChange={(e) => updateTaskTitle(t.id, e.target.value)}
                      placeholder="タスク名"
                    />
                  </div>

                  {/* 右側： ⋮ ＋ － */}
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
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.saveBtn} onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
