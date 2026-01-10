import styles from "./ProjectModal.module.scss";
import { useEffect, useMemo, useState } from "react";
import type { ID, Project, Task } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project, tasks: Task[]) => void;

  project?: Project | null;
  tasks?: Task[] | null;
};

const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const now = () => new Date().toISOString();

/**
 * order_index を必ず 0..n-1 に整える（欠番/重複を絶対に作らない）
 * ※ここでは「配列順」基準で正規化
 */
function normalizeOrderIndex(list: Task[]): Task[] {
  const ts = now();
  return list.map((t, i) => ({
    ...t,
    order_index: i,
    updated_at: ts,
  }));
}

function createDraftTask(
  projectId: ID,
  title = "",
  parentTaskId: ID | null = null
): Task {
  const ts = now();
  return {
    id: uid(),
    project_id: projectId,
    label_id: null,
    parent_task_id: parentTaskId,
    order_index: 0,
    title,
    memo: null,
    completed: false,
    completed_at: null,
    is_fixed: false,
    created_at: ts,
    updated_at: ts,
  };
}

type ViewRow = {
  t: Task;
  depth: 0 | 1;
  hasChildren: boolean;
  isExpanded: boolean;
};

export default function ProjectModal({
  open,
  onClose,
  onSave,
  project,
  tasks,
}: Props) {
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<ID, string | null>>({});
  const [submitTried, setSubmitTried] = useState(false);

  // 展開状態
  const [expandedIds, setExpandedIds] = useState<Set<ID>>(new Set());

  const [draftProject, setDraftProject] = useState<Project>(() => {
    const ts = now();
    return {
      id: uid(),
      name: "",
      label_id: null,
      current_order_index: 0,
      created_at: ts,
      updated_at: ts,
    };
  });

  const [draftTasks, setDraftTasks] = useState<Task[]>(() => {
    const projectId = uid();
    return normalizeOrderIndex([createDraftTask(projectId), createDraftTask(projectId)]);
  });

  // open時に新規/編集で初期化
  useEffect(() => {
    if (!open) return;

    setSubmitTried(false);
    setProjectNameError(null);
    setTaskErrors({});
    setExpandedIds(new Set());

    const ts = now();

    // ===== 編集モード =====
    if (project) {
      setDraftProject({ ...project, updated_at: ts });

      const base = (tasks ?? [])
        .map((t) => ({ ...t }))
        .sort((a, b) => a.order_index - b.order_index);

      // root（parent_task_id=null）が2件未満なら追加して2件に
      const rootCount = base.filter((t) => !t.parent_task_id).length;
      const ensured =
        rootCount >= 2
          ? base
          : [
              ...base,
              ...Array.from({ length: 2 - rootCount }, () =>
                createDraftTask(project.id, "", null)
              ),
            ];

      setDraftTasks(normalizeOrderIndex(ensured));
      return;
    }

    // ===== 新規作成モード =====
    const newProjectId = uid();
    setDraftProject({
      id: newProjectId,
      name: "",
      label_id: null,
      current_order_index: 0,
      created_at: ts,
      updated_at: ts,
    });

    setDraftTasks(
      normalizeOrderIndex([createDraftTask(newProjectId), createDraftTask(newProjectId)])
    );
  }, [open, project, tasks]);

  // Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 親ID -> 子の配列（表示/展開用）
  const childrenByParent = useMemo(() => {
    const byOrder = (a: Task, b: Task) => a.order_index - b.order_index;
    const map = new Map<ID, Task[]>();
    for (const t of draftTasks) {
      if (!t.parent_task_id) continue;
      const arr = map.get(t.parent_task_id) ?? [];
      arr.push(t);
      map.set(t.parent_task_id, arr);
    }
    for (const [pid, arr] of map) {
      arr.sort(byOrder);
      map.set(pid, arr);
    }
    return map;
  }, [draftTasks]);

  const roots = useMemo(() => {
    return [...draftTasks]
      .filter((t) => !t.parent_task_id)
      .sort((a, b) => a.order_index - b.order_index);
  }, [draftTasks]);

  const hasChildren = (id: ID) => (childrenByParent.get(id)?.length ?? 0) > 0;

  // ✅ 「表示する行」だけを作る（root + 展開中の子）
  const viewRows: ViewRow[] = useMemo(() => {
    const rows: ViewRow[] = [];
    for (const r of roots) {
      const rHas = hasChildren(r.id);
      const rOpen = rHas && expandedIds.has(r.id);

      rows.push({
        t: r,
        depth: 0,
        hasChildren: rHas,
        isExpanded: rOpen,
      });

      if (rOpen) {
        const kids = childrenByParent.get(r.id) ?? [];
        for (const c of kids) {
          const cHas = hasChildren(c.id);
          const cOpen = cHas && expandedIds.has(c.id);
          rows.push({
            t: c,
            depth: 1,
            hasChildren: cHas,
            isExpanded: cOpen,
          });
        }
      }
    }
    return rows;
  }, [roots, childrenByParent, expandedIds]);

  const rootCount = useMemo(
    () => draftTasks.filter((t) => !t.parent_task_id).length,
    [draftTasks]
  );

  // ============ UI操作 ============

  const toggleExpand = (id: ID) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateTaskTitle = (id: ID, title: string) => {
    setDraftTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updated_at: now() } : t))
    );

    if (submitTried) {
      setTaskErrors((prev) => ({
        ...prev,
        [id]: title.trim() ? null : "入力してください",
      }));
    }
  };

  const updateProjectName = (name: string) => {
    setDraftProject((prev) => ({ ...prev, name, updated_at: now() }));
    if (submitTried) setProjectNameError(name.trim() ? null : "入力してください");
  };

  // 追加：指定行の直後に、同じ親として追加
  const addTaskAfter = (afterId: ID) => {
    setDraftTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === afterId);
      if (idx < 0) return prev;

      const after = prev[idx];
      const next = [...prev];
      next.splice(
        idx + 1,
        0,
        createDraftTask(draftProject.id, "", after.parent_task_id ?? null)
      );
      return normalizeOrderIndex(next);
    });
  };

  // 削除：rootが2件未満にならない / 親を消したら子も消す
  const removeTask = (id: ID) => {
    setDraftTasks((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;

      // 親を消すなら子も一緒に消す
      const removed = prev.filter((t) => t.id !== id && t.parent_task_id !== id);

      const nextRootCount = removed.filter((t) => !t.parent_task_id).length;
      if (nextRootCount < 2) return prev;

      // 展開状態からも消しとく（地味に大事）
      setExpandedIds((old) => {
        const n = new Set(old);
        n.delete(id);
        return n;
      });

      return normalizeOrderIndex(removed);
    });
  };

  // 保存可能か（root入力済み2件以上）
  const canSave = useMemo(() => {
    const projectName = draftProject.name.trim();
    if (!projectName) return false;

    const filledRootCount = draftTasks
      .filter((t) => !t.parent_task_id)
      .filter((t) => t.title.trim().length > 0).length;

    return filledRootCount >= 2;
  }, [draftProject.name, draftTasks]);

  const handleSave = () => {
    setSubmitTried(true);

    const pName = draftProject.name.trim();
    setProjectNameError(pName ? null : "入力してください");

    const nextTaskErrors: Record<ID, string | null> = {};
    for (const t of draftTasks) {
      nextTaskErrors[t.id] = t.title.trim() ? null : "入力してください";
    }
    setTaskErrors(nextTaskErrors);

    // rootで2件以上
    const filledRootTasks = draftTasks
      .filter((t) => !t.parent_task_id)
      .map((t) => ({ ...t, title: t.title.trim() }))
      .filter((t) => t.title.length > 0);

    if (!pName || filledRootTasks.length < 2) return;

    const ts = now();

    const projectToSave: Project = {
      ...draftProject,
      name: pName,
      current_order_index: project ? project.current_order_index ?? 0 : 0,
      updated_at: ts,
    };

    // 今は root だけ保存（子は次ステップ）
    const tasksToSave: Task[] = normalizeOrderIndex(
      filledRootTasks.map((t) => ({
        ...t,
        project_id: projectToSave.id,
        parent_task_id: null,
        updated_at: ts,
      }))
    );

    onSave(projectToSave, tasksToSave);
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="プロジェクト作成/編集"
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

          {/* プロジェクト名 */}
          <div className={styles.projectNameRow}>
            <input
              className={styles.projectNameInput}
              value={draftProject.name}
              onChange={(e) => updateProjectName(e.target.value)}
              placeholder="プロジェクト名"
            />
            <div className={styles.projectUnderline} />
            {projectNameError && <div className={styles.fieldError}>{projectNameError}</div>}
          </div>

          {/* タイムライン */}
          <div className={styles.timeline}>
            <div className={styles.dot} data-pos="start" aria-hidden />

            <div className={styles.list}>
              {viewRows.map(({ t, depth, hasChildren, isExpanded }) => (
                <div
                  key={t.id}
                  className={styles.item}
                  data-depth={String(depth)}
                  data-parent={hasChildren ? "1" : "0"}
                  data-expanded={isExpanded ? "1" : "0"}
                >
                  {/* 左：展開アイコン */}
                  <div className={styles.itemLeft}>
                    {hasChildren ? (
                      <button
                        type="button"
                        className={styles.expandBtn}
                        aria-label={isExpanded ? "折りたたむ" : "展開する"}
                        onClick={() => toggleExpand(t.id)}
                        data-open={isExpanded ? "1" : "0"}
                      >
                        <ChevronIcon />
                      </button>
                    ) : (
                      <div className={styles.expandSpacer} />
                    )}
                  </div>

                  {/* 中央：入力 */}
                  <div className={styles.taskCard}>
                    <input
                      className={styles.taskInput}
                      value={t.title}
                      onChange={(e) => updateTaskTitle(t.id, e.target.value)}
                      placeholder="タスク名"
                    />
                    {taskErrors[t.id] && (
                      <div className={styles.fieldError}>{taskErrors[t.id]}</div>
                    )}
                  </div>

                  {/* 右：操作 */}
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
                      disabled={!t.parent_task_id && rootCount <= 2}
                      title={!t.parent_task_id && rootCount <= 2 ? "rootは最低2件必要です" : "削除"}
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
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={!canSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.chev} aria-hidden="true">
      <path
        d="M4 8 L12 16 L20 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
