import styles from "./ProjectModal.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ID, Project, Task, Label } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project, tasks: Task[]) => void;

  labels: Label[];

  project?: Project | null;
  tasks?: Task[] | null;

  onDelete?: (projectId: ID) => void;

  // soloタスク → project化の引き継ぎ
  convertTaskId?: ID | null;
  convertTaskTitle?: string;
  convertTaskMemo?: string | null;
  convertLabelId?: ID | null;
};

const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());
const now = () => new Date().toISOString();

/** order_index を 0..n-1 に正規化（欠番/重複を作らない） */
function normalizeOrderIndex(list: Task[]): Task[] {
  const ts = now();
  return list.map((t, i) => ({
    ...t,
    order_index: i,
    updated_at: ts,
  }));
}

function createDraftProject(labelId: ID | null = null): Project {
  const ts = now();
  return {
    id: uid() as ID,
    title: "",
    label_id: labelId,
    current_order_index: 0,
    created_at: ts,
    updated_at: ts,
  };
}

function createDraftTask(projectId: ID, title = "", parentTaskId: ID | null = null): Task {
  const ts = now();
  return {
    id: uid() as ID,
    title,
    project_id: projectId,
    label_id: null,
    parent_task_id: parentTaskId,
    order_index: 0,
    memo: null,
    completed: false,
    completed_at: null,
    is_fixed: false,
    is_group: false,
    created_at: ts,
    updated_at: ts,
  };
}

type ViewRow = {
  t: Task;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
};

export default function ProjectModal({
  open,
  onClose,
  onSave,
  project,
  tasks,
  labels,
  onDelete,
  convertTaskId,
  convertTaskTitle,
  convertTaskMemo,
  convertLabelId,
}: Props) {
  const isEdit = !!project;

  const [submitTried, setSubmitTried] = useState(false);
  const [projectTitleError, setProjectTitleError] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<ID, string | null>>({});

  const [labelOpen, setLabelOpen] = useState(false);
  const labelWrapRef = useRef<HTMLDivElement | null>(null);

  const [moreOpenTaskId, setMoreOpenTaskId] = useState<ID | null>(null);
  const moreWrapRefs = useRef(new Map<ID, HTMLDivElement>());

  // 「projectize」した親ID（保存前クリーニング用）
  const [projectizedIds, setProjectizedIds] = useState<Set<ID>>(() => new Set<ID>());

  // 展開状態
  const [expandedIds, setExpandedIds] = useState<Set<ID>>(() => new Set<ID>());

  // 詳細モーダル
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<ID | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailMemo, setDetailMemo] = useState<string>("");

  // 削除確認
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [draftProject, setDraftProject] = useState<Project>(() =>
    createDraftProject(convertLabelId ?? null)
  );
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);

  /** open時に初期化 */
  useEffect(() => {
    if (!open) return;

    setSubmitTried(false);
    setProjectTitleError(null);
    setTaskErrors({});
    setExpandedIds(new Set());
    setMoreOpenTaskId(null);
    setProjectizedIds(new Set());

    const ts = now();

    // 編集モード
    if (project) {
      setDraftProject({ ...project, updated_at: ts });

      const base = (tasks ?? [])
        .map((t) => ({ ...t }))
        .sort((a, b) => a.order_index - b.order_index);

      // rootが0なら最低1件確保
      const rootCount = base.filter((t) => !t.parent_task_id).length;
      const ensured = rootCount > 0 ? base : [...base, createDraftTask(project.id, "", null)];

      setDraftTasks(normalizeOrderIndex(ensured));
      return;
    }

    // 新規作成モード
    const p = createDraftProject(convertLabelId ?? null);
    setDraftProject(p);

    const base: Task[] = [createDraftTask(p.id), createDraftTask(p.id), createDraftTask(p.id)];

    // solo→project化の引き継ぎ（1個目へ）
    if (convertTaskId) {
      base[0] = {
        ...base[0],
        id: convertTaskId,
        title: convertTaskTitle ?? "",
        memo: convertTaskMemo ?? null,
        updated_at: ts,
      };
    }

    setDraftTasks(normalizeOrderIndex(base));
  }, [open, project, tasks, convertTaskId, convertTaskTitle, convertTaskMemo, convertLabelId]);

  /** Escで閉じる */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  /** ラベルメニュー外クリックで閉じる */
  useEffect(() => {
    if (!open || !labelOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = labelWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setLabelOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, labelOpen]);

  /** ⋮メニュー外クリックで閉じる */
  useEffect(() => {
    if (!open || !moreOpenTaskId) return;

    const onMouseDown = (e: MouseEvent) => {
      const wrap = moreWrapRefs.current.get(moreOpenTaskId);
      if (!wrap) return;
      if (!wrap.contains(e.target as Node)) setMoreOpenTaskId(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, moreOpenTaskId]);

  // 親ID -> 子配列
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

  // 表示行
  const viewRows: ViewRow[] = useMemo(() => {
    const rows: ViewRow[] = [];

    const walk = (node: Task, depth: number) => {
      const nodeHas = hasChildren(node.id);
      const nodeOpen = nodeHas && expandedIds.has(node.id);

      rows.push({
        t: node,
        depth,
        hasChildren: nodeHas,
        isExpanded: nodeOpen,
      });

      if (nodeOpen) {
        const kids = childrenByParent.get(node.id) ?? [];
        for (const c of kids) walk(c, depth + 1);
      }
    };

    for (const r of roots) walk(r, 0);
    return rows;
  }, [roots, childrenByParent, expandedIds]);

  const rootCount = useMemo(
    () => draftTasks.filter((t) => !t.parent_task_id).length,
    [draftTasks]
  );

  // ========= UI操作 =========

  const openDetail = (id: ID) => {
    const target = draftTasks.find((x) => x.id === id);
    if (!target) return;

    setDetailTaskId(id);
    setDetailTitle(target.title ?? "");
    setDetailMemo(target.memo ?? "");
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailTaskId(null);
  };

  const toggleExpand = (id: ID) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateProjectTitle = (title: string) => {
    setDraftProject((prev) => ({ ...prev, title, updated_at: now() }));
    if (submitTried) setProjectTitleError(title.trim() ? null : "入力してください");
  };

  const updateTaskTitle = (id: ID, title: string) => {
    setDraftTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, updated_at: now() } : t))
    );

    if (!submitTried) return;

    const target = draftTasks.find((x) => x.id === id);
    if (target?.parent_task_id) return; // rootのみ必須にしたいならここ維持

    setTaskErrors((prev) => ({
      ...prev,
      [id]: title.trim() ? null : "入力してください",
    }));
  };

  // 指定行の直後に同じ親で追加
  const addTaskAfter = (afterId: ID) => {
    setDraftTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === afterId);
      if (idx < 0) return prev;

      const after = prev[idx];
      const next = [...prev];
      next.splice(idx + 1, 0, createDraftTask(draftProject.id, "", after.parent_task_id ?? null));
      return normalizeOrderIndex(next);
    });
  };

  // 削除（親を消したら子も消す / rootは最低1件維持）
  const removeTask = (id: ID) => {
    setDraftTasks((prev) => {
      const toDelete = new Set<ID>();
      const stack = [id];

      while (stack.length) {
        const cur = stack.pop()!;
        toDelete.add(cur);
        for (const t of prev) {
          if (t.parent_task_id === cur) stack.push(t.id);
        }
      }

      const removed = prev.filter((t) => !toDelete.has(t.id));
      const nextRootCount = removed.filter((t) => !t.parent_task_id).length;
      if (nextRootCount < 1) return prev;

      setExpandedIds((old) => {
        const n = new Set(old);
        for (const del of toDelete) n.delete(del);
        return n;
      });

      return normalizeOrderIndex(removed);
    });
  };

  // プロジェクト化：親を is_group=true にして、子を1件作る（既に子があるなら何もしない）
  const projectizeTask = (id: ID) => {
    setDraftTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;

      const target = prev[idx];

      // 既に子があるなら追加しない
      const alreadyHasChild = prev.some((t) => t.parent_task_id === id);
      if (alreadyHasChild) return prev;

      const ts = now();
      const next = [...prev];

      next[idx] = { ...target, is_group: true, updated_at: ts };

      const child = createDraftTask(draftProject.id, "", id);
      next.splice(idx + 1, 0, child);

      return normalizeOrderIndex(next);
    });

    setProjectizedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });

    setExpandedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
  };

  // 保存可能条件
  const canSave = useMemo(() => {
    const projectTitle = draftProject.title.trim();
    if (!projectTitle) return false;

    const filledRootCount = draftTasks
      .filter((t) => !t.parent_task_id)
      .filter((t) => (t.title ?? "").trim().length > 0).length;

    return filledRootCount >= 1;
  }, [draftProject.title, draftTasks]);

  const handleSave = () => {
    setSubmitTried(true);

    const pTitle = draftProject.title.trim();
    setProjectTitleError(pTitle ? null : "入力してください");
    if (!pTitle) return;

    const ts = now();

    const projectToSave: Project = {
      ...draftProject,
      title: pTitle,
      current_order_index: isEdit ? (project?.current_order_index ?? 0) : 0,
      updated_at: ts,
    };

    // 1) title trim
    const trimmedAll = draftTasks.map((t) => ({
      ...t,
      title: (t.title ?? "").trim(),
    }));

    // 2) 空タイトルは保存しない
    const nonEmpty = trimmedAll.filter((t) => t.title.length > 0);

    // 3) 保存される子数を親ごとに数える
    const savedChildCountByParent = new Map<ID, number>();
    for (const t of nonEmpty) {
      if (!t.parent_task_id) continue;
      savedChildCountByParent.set(
        t.parent_task_id,
        (savedChildCountByParent.get(t.parent_task_id) ?? 0) + 1
      );
    }

    // 4) projectized なのに子が0の親は削除対象
    const removedParentIds = new Set<ID>();
    for (const t of nonEmpty) {
      const childCount = savedChildCountByParent.get(t.id) ?? 0;
      if (projectizedIds.has(t.id) && childCount === 0) {
        removedParentIds.add(t.id);
      }
    }

    // 5) 親が消えるならその配下も消す
    const cleaned = nonEmpty.filter((t) => {
      if (removedParentIds.has(t.id)) return false;
      if (t.parent_task_id && removedParentIds.has(t.parent_task_id)) return false;
      return true;
    });

    // rootが1件以上必要
    const cleanedRoots = cleaned.filter((t) => !t.parent_task_id);
    if (cleanedRoots.length < 1) return;

    // rootのエラー判定
    const nextTaskErrors: Record<ID, string | null> = {};
    for (const t of cleaned) {
      if (t.parent_task_id) continue;
      nextTaskErrors[t.id] = t.title.trim() ? null : "入力してください";
    }
    setTaskErrors(nextTaskErrors);

    const labelId = projectToSave.label_id ?? null;

    // 保存用 tasks
    const tasksToSave: Task[] = normalizeOrderIndex(
      cleaned.map((t) => ({
        ...t,
        project_id: projectToSave.id,
        label_id: labelId,
        updated_at: ts,
      }))
    );

    onSave(projectToSave, tasksToSave);
    onClose();
  };

  if (!open) return null;

  const currentLabel = labels.find((l) => l.id === draftProject.label_id) ?? null;

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
            {/* ラベル選択 */}
            <div className={styles.labelWrap} ref={labelWrapRef}>
              <button
                type="button"
                className={styles.labelBtn}
                onClick={() => setLabelOpen((v) => !v)}
              >
                <span
                  className={styles.labelDot}
                  style={{ background: currentLabel?.color ?? "#BDBDBD" }}
                />
                <span className={styles.labelBtnText}>
                  {currentLabel ? currentLabel.title : "ラベルなし"}
                </span>
                <span className={styles.caret}>▼</span>
              </button>

              {labelOpen && (
                <div className={styles.labelMenu}>
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={styles.labelItem}
                      onClick={() => {
                        setDraftProject((prev) => ({
                          ...prev,
                          label_id: l.id,
                          updated_at: now(),
                        }));
                        setLabelOpen(false);
                      }}
                    >
                      <span
                        className={styles.labelDot}
                        style={{ background: l.color ?? "#BDBDBD" }}
                      />
                      {l.title}
                    </button>
                  ))}

                  <button
                    type="button"
                    className={styles.labelItem}
                    onClick={() => {
                      setDraftProject((prev) => ({ ...prev, label_id: null, updated_at: now() }));
                      setLabelOpen(false);
                    }}
                  >
                    ラベルなし
                  </button>
                </div>
              )}
            </div>

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
              value={draftProject.title}
              onChange={(e) => updateProjectTitle(e.target.value)}
              placeholder={projectTitleError ? "入力してください" : "プロジェクト名"}
              data-error={projectTitleError ? "1" : "0"}
            />
            <div className={styles.projectUnderline} />
          </div>

          {/* タイムライン */}
          <div className={styles.timeline}>
            <div className={styles.dot} data-pos="start" aria-hidden />

            <div className={styles.list}>
              {viewRows.map(({ t, depth, hasChildren: h, isExpanded }) => (
                <div
                  key={t.id}
                  className={styles.item}
                  data-depth={String(depth)}
                  data-parent={h ? "1" : "0"}
                  data-expanded={isExpanded ? "1" : "0"}
                >
                  {/* 左：展開 */}
                  <div className={styles.itemLeft}>
                    {h ? (
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

                  {/* 中央：カード */}
                  <div className={styles.taskCard} data-error={taskErrors[t.id] ? "1" : "0"}>
                    <input
                      className={styles.taskInput}
                      value={t.title ?? ""}
                      onChange={(e) => updateTaskTitle(t.id, e.target.value)}
                      placeholder={taskErrors[t.id] ? "入力してください" : "タスク名"}
                      data-error={taskErrors[t.id] ? "1" : "0"}
                    />
                  </div>

                  {/* 右：操作 */}
                  <div className={styles.itemRight}>
                    <div
                      className={styles.moreWrap}
                      ref={(el) => {
                        if (!el) return;
                        moreWrapRefs.current.set(t.id, el);
                      }}
                    >
                      <button
                        type="button"
                        className={styles.moreBtn}
                        aria-label="メニュー"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpenTaskId((prev) => (prev === t.id ? null : t.id));
                        }}
                      >
                        ⋮
                      </button>

                      {moreOpenTaskId === t.id && (
                        <div className={styles.moreMenu}>
                          <button
                            type="button"
                            className={styles.moreItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoreOpenTaskId(null);
                              openDetail(t.id);
                            }}
                          >
                            タスク詳細
                          </button>

                          <button
                            type="button"
                            className={styles.moreItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              projectizeTask(t.id);
                              setMoreOpenTaskId(null);
                            }}
                          >
                            プロジェクト化
                          </button>
                        </div>
                      )}
                    </div>

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
                      disabled={!t.parent_task_id && rootCount <= 1}
                      title={!t.parent_task_id && rootCount <= 1 ? "rootは最低1件必要です" : "削除"}
                    >
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.dot} data-pos="end" aria-hidden />
          </div>

          {/* フッター */}
          <div className={styles.footer}>
            {isEdit && onDelete && (
              <button
                type="button"
                className={styles.deleteProjectBtn}
                onClick={() => setConfirmOpen(true)}
              >
                削除
              </button>
            )}

            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              data-disabled={!canSave ? "1" : "0"}
            >
              保存
            </button>
          </div>
        </div>

        {/* 詳細モーダル */}
        {detailOpen && detailTaskId && (
          <div className={styles.detailBackdrop} role="presentation" onClick={closeDetail}>
            <div
              className={styles.detailModal}
              role="dialog"
              aria-modal="true"
              aria-label="タスク編集"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.detailTopRow}>
                <button
                  type="button"
                  className={styles.detailIconBtn}
                  aria-label="閉じる"
                  onClick={closeDetail}
                >
                  ✕
                </button>
              </div>

              <div className={styles.detailTitleWrap}>
                <input
                  className={styles.detailTitleInput}
                  value={detailTitle}
                  onChange={(e) => setDetailTitle(e.target.value)}
                  placeholder="タスク名"
                />
              </div>

              <div className={styles.detailMemoWrap}>
                <div className={styles.detailMemoLabel}>メモ</div>
                <textarea
                  className={styles.detailMemoArea}
                  value={detailMemo}
                  onChange={(e) => setDetailMemo(e.target.value)}
                  placeholder="メモ"
                />
              </div>

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className={styles.detailDeleteBtn}
                  onClick={() => {
                    const id = detailTaskId;
                    closeDetail();
                    removeTask(id);
                  }}
                >
                  削除
                </button>

                <button
                  type="button"
                  className={styles.detailSaveBtn}
                  onClick={() => {
                    setDraftTasks((prev) =>
                      prev.map((t) =>
                        t.id === detailTaskId
                          ? {
                              ...t,
                              title: detailTitle,
                              memo: detailMemo.length ? detailMemo : null,
                              updated_at: now(),
                            }
                          : t
                      )
                    );

                    if (submitTried && detailTaskId) {
                      const target = draftTasks.find((x) => x.id === detailTaskId);
                      const isRoot = !target?.parent_task_id;
                      if (isRoot) {
                        setTaskErrors((prev) => ({
                          ...prev,
                          [detailTaskId]: detailTitle.trim() ? null : "入力してください",
                        }));
                      }
                    }

                    closeDetail();
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認 */}
        {confirmOpen && (
          <div
            className={styles.confirmBackdrop}
            role="presentation"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className={styles.confirmModal}
              role="dialog"
              aria-modal="true"
              aria-label="削除確認"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.confirmTitle}>本当に削除しますか？</div>
              <div className={styles.confirmText}>
                このプロジェクトと、配下のタスクをすべて削除します。
              </div>

              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.confirmCancel}
                  onClick={() => setConfirmOpen(false)}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className={styles.confirmDelete}
                  onClick={() => {
                    if (!project) return;
                    onDelete?.(project.id);
                    setConfirmOpen(false);
                    onClose();
                  }}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
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