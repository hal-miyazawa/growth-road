import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api"; // API ユーティリティをインポート
import AppLayout from "../layouts/AppLayout";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import styles from "./Dashboard.module.scss";
import FabMenu from "../components/FabMenu/FabMenu";
import TaskModal from "../components/TaskModal/TaskModal";
import ProjectModal from "../components/ProjectModal/ProjectModal";
import { LabelRenameContext } from "../components/Sidebar/Sidebar";
import type { ID, Label, Project, Task } from "../types/models";

const now = () => new Date().toISOString();

const legacyLabelNameById: Record<string, string> = {
  "label-study": "資格勉強",
  "label-home": "家事",
  "label-work": "仕事",
  "label-health": "健康",
  "label-dev": "開発",
  "label-money": "お金",
};

// --- mock用（本番では DB/API から取得する想定） ---
const initialProjects: Project[] = [
  { id: "proj-study", title: "学習", label_id: "label-study", current_order_index: 0, created_at: now(), updated_at: now() },
  { id: "proj-home",  title: "家事", label_id: "label-home",  current_order_index: 0, created_at: now(), updated_at: now() },

  // 追加プロジェクト
  { id: "proj-dev",    title: "卒制", label_id: "label-dev",    current_order_index: 0, created_at: now(), updated_at: now() },
  { id: "proj-work",   title: "バイト", label_id: "label-work", current_order_index: 0, created_at: now(), updated_at: now() },
  { id: "proj-health", title: "健康", label_id: "label-health", current_order_index: 0, created_at: now(), updated_at: now() },
];

const initialTasks: Task[] = [
  // ======================
  // 資格勉強
  // ======================
  { id: "t1", project_id: "proj-study", label_id: "label-study", parent_task_id: null, order_index: 0, title: "過去問演習（1週目）", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t2", project_id: "proj-study", label_id: "label-study", parent_task_id: null, order_index: 1, title: "問題整理ミーティング", memo: null, completed: false, completed_at: null, is_fixed: false, is_group: true, created_at: now(), updated_at: now() },
  { id: "t11", project_id: "proj-study", label_id: "label-study", parent_task_id: "t2", order_index: 0, title: "問題整理 A", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t12", project_id: "proj-study", label_id: "label-study", parent_task_id: "t2", order_index: 1, title: "問題整理 B", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t3", project_id: "proj-study", label_id: "label-study", parent_task_id: null, order_index: 2, title: "模擬試験ノート", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // ======================
  // 家事
  // ======================
  { id: "h1", project_id: "proj-home", label_id: "label-home", parent_task_id: null, order_index: 0, title: "掃除チェック", memo: null, completed: false, completed_at: null, is_fixed: false, is_group: true, created_at: now(), updated_at: now() },
  { id: "h11", project_id: "proj-home", label_id: "label-home", parent_task_id: "h1", order_index: 0, title: "洗濯・乾燥", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "h2", project_id: "proj-home", label_id: "label-home", parent_task_id: null, order_index: 1, title: "キッチン片付け", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // ======================
  // 開発
  // ======================
  { id: "d1", project_id: "proj-dev", label_id: "label-dev", parent_task_id: null, order_index: 0, title: "Project改善", memo: "UIと保存処理", completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "d2", project_id: "proj-dev", label_id: "label-dev", parent_task_id: null, order_index: 1, title: "ラベル統一", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "d3", project_id: "proj-dev", label_id: "label-dev", parent_task_id: null, order_index: 2, title: "子タスク追加テスト", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // ======================
  // バイト
  // ======================
  { id: "w1", project_id: "proj-work", label_id: "label-work", parent_task_id: null, order_index: 0, title: "シフト応募", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "w2", project_id: "proj-work", label_id: "label-work", parent_task_id: null, order_index: 1, title: "来週の予定確認", memo: "ピン留め", completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // ======================
  // 健康
  // ======================
  { id: "he1", project_id: "proj-health", label_id: "label-health", parent_task_id: null, order_index: 0, title: "ストレッチ", memo: null, completed: false, completed_at: null, is_fixed: false, is_group: true, created_at: now(), updated_at: now() },
  { id: "he11", project_id: "proj-health", label_id: "label-health", parent_task_id: "he1", order_index: 0, title: "朝ストレッチ", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "he2", project_id: "proj-health", label_id: "label-health", parent_task_id: null, order_index: 1, title: "散歩20分", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // ======================
  // ソロタスク（project_id=null）
  // ======================
  { id: "solo-1", project_id: null, label_id: "label-home", parent_task_id: null, order_index: 0, title: "買い物メモ", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "solo-2", project_id: null, label_id: "label-work", parent_task_id: null, order_index: 1, title: "メール返信", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // 追加ソロタスク
  { id: "solo-4", project_id: null, label_id: "label-home", parent_task_id: null, order_index: 3, title: "ゴミ出し", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "solo-6", project_id: null, label_id: "label-health", parent_task_id: null, order_index: 5, title: "水飲む", memo: "1.5L目標", completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "solo-7", project_id: null, label_id: "label-money", parent_task_id: null, order_index: 6, title: "家計メモ", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
];

// --- プロジェクトの「未完了のleafタスク（グループは除外）」のID一覧を作る ---
function buildFlatLeafTaskIds(allTasks: Task[], projectId: ID): ID[] {
  const list = allTasks.filter((t) => t.project_id === projectId);

  const roots: Task[] = [];
  const childrenByParent = new Map<ID, Task[]>();

  for (const t of list) {
    if (t.parent_task_id) {
      const arr = childrenByParent.get(t.parent_task_id) ?? [];
      arr.push(t);
      childrenByParent.set(t.parent_task_id, arr);
    } else {
      roots.push(t);
    }
  }

  const byOrder = (a: Task, b: Task) => a.order_index - b.order_index;
  roots.sort(byOrder);
  for (const [pid, arr] of childrenByParent) {
    arr.sort(byOrder);
    childrenByParent.set(pid, arr);
  }

  const out: ID[] = [];

  const pushChildrenRec = (parentId: ID) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const c of children) {
      const grand = childrenByParent.get(c.id);

      // グループタスクは「leaf扱いしない」：孫があれば辿るだけ
      if (c.is_group) {
        if (grand && grand.length > 0) pushChildrenRec(c.id);
        continue;
      }

      // 子を持つ通常タスク：さらに下にleafがあるので再帰
      if (grand && grand.length > 0) {
        pushChildrenRec(c.id);
      } else {
        out.push(c.id);
      }
    }
  };

  for (const r of roots) {
    const children = childrenByParent.get(r.id);

    // rootがグループなら、子がある場合だけ降りる
    if (r.is_group) {
      if (children && children.length > 0) pushChildrenRec(r.id);
      continue;
    }

    if (children && children.length > 0) {
      // rootが通常タスクで子がある：leafを探しに降りる
      pushChildrenRec(r.id);
    } else {
      // rootがleaf（かつグループではない）なら追加
      out.push(r.id);
    }
  }

  return out;
}

function findLabel(labels: Label[], labelId?: ID | null) {
  if (!labelId) return null;
  return labels.find((l) => l.id === labelId) ?? null;
}

export default function Dashboard() {
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<ID | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<ID | null>(null);
  const [convertSoloTaskId, setConvertSoloTaskId] = useState<ID | null>(null);
  const [convertSoloTaskTitle, setConvertSoloTaskTitle] = useState("");
  const [convertSoloTaskMemo, setConvertSoloTaskMemo] = useState<string | null>(null);
  const [convertSoloLabelId, setConvertSoloLabelId] = useState<string | null>(null);

  // DB/API から取得して表示する（ここが正常に動けば OK）
  const [labels, setLabels] = useState<Label[]>([]);

  // Manual check (labels):
  // - Reload shows labels from /api/labels in the sidebar.
  // - Add/color change/delete reflect in the sidebar and persist after reload.
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // モーダルで編集中のタスクID
  const [editingTaskId, setEditingTaskId] = useState<ID | null>(null);

  // task検索用
  const taskById = useMemo(() => new Map<ID, Task>(tasks.map((t) => [t.id, t])), [tasks]);

  // プロジェクトごとのleafタスクID一覧
  const flatIdsByProject = useMemo(() => {
    const map = new Map<ID, ID[]>();
    for (const p of projects) {
      map.set(p.id, buildFlatLeafTaskIds(tasks, p.id));
    }
    return map;
  }, [projects, tasks]);

  const handleAddLabel = async (title: string, color: string | null) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // 同名ラベルは追加しない（簡易ガード）
    if (labels.some((l) => l.title.trim() === trimmed)) return;

    const created = await apiPost<Label>("/api/labels", {
      title: trimmed,
      color,
    });

    setLabels((prev) => [...prev, created]);
  };

  const handleUpdateLabelColor = async (id: ID, color: string) => {
    const updated = await apiPatch<Label>(`/api/labels/${id}`, { color });
    setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleRenameLabel = async (id: ID, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated = await apiPatch<Label>(`/api/labels/${id}`, {
      title: trimmed,
    });
    setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const handleDeleteLabel = async (id: ID) => {
    // どこかで使用中のラベルは削除できない
    const usedByProject = projects.some((p) => p.label_id === id);
    const usedByTask = tasks.some((t) => t.label_id === id);
    if (usedByProject || usedByTask) {
      alert("このラベルはプロジェクト/タスクで使用中のため削除できません。");
      return;
    }

    try {
      await apiDelete(`/api/labels/${id}`);
      setLabels((prev) => prev.filter((l) => l.id !== id));

      // 念のため、該当ラベルを参照しているものがあれば解除
      setProjects((prev) => prev.map((p) => (p.label_id === id ? { ...p, label_id: null } : p)));
      setTasks((prev) => prev.map((t) => (t.label_id === id ? { ...t, label_id: null } : t)));

      if (selectedLabelId === id) setSelectedLabelId(null);
    } catch (e) {
      alert("削除に失敗しました。（使用中の可能性があります）");
    }
  };

  // ソロタスクをプロジェクト化するための準備
  const openProjectFromSoloTask = (t: Task) => {
    setConvertSoloTaskId(t.id);
    setConvertSoloTaskTitle(t.title ?? "");
    setConvertSoloTaskMemo(t.memo ?? null);
    setProjectOpen(true);
    setConvertSoloLabelId(t.label_id ?? null);
  };

  // project.current_order_index から「次の未完了タスク」に進める
  const advanceProjectIndexToNextUncompleted = (projectId: ID, fromIndex: number) => {
    const flat = flatIdsByProject.get(projectId) ?? [];
    let idx = fromIndex;

    while (idx < flat.length) {
      const t = taskById.get(flat[idx]);
      if (t && !t.completed) return idx;
      idx += 1;
    }
    // 末尾まで完了なら flat.length（表示対象なし）
    return flat.length;
  };

  // 初回ロード
  useEffect(() => {
    (async () => {
      const serverLabels = await apiGet<Label[]>("/api/labels");
      setLabels(serverLabels);

      // 旧label_id（label-study等）を、サーバーのlabel.idに付け替える
      const titleToId = new Map(serverLabels.map((l) => [l.title.trim(), l.id]));

      setProjects((prev) =>
        prev.map((p) => {
          const legacyName = p.label_id ? legacyLabelNameById[p.label_id] : null;
          const newId = legacyName ? titleToId.get(legacyName) : null;
          return newId ? { ...p, label_id: newId } : p;
        })
      );

      setTasks((prev) =>
        prev.map((t) => {
          const legacyName = t.label_id ? legacyLabelNameById[t.label_id] : null;
          const newId = legacyName ? titleToId.get(legacyName) : null;
          return newId ? { ...t, label_id: newId } : t;
        })
      );
    })().catch(console.error);
  }, []);

  // カード表示用VM
  const cards = useMemo(() => {
    const projectCards = projects
      .map((p) => {
        const label = findLabel(labels, p.label_id);
        const flat = flatIdsByProject.get(p.id) ?? [];

        // current_order_index を「次の未完了」に寄せる
        const safeIndex = advanceProjectIndexToNextUncompleted(p.id, p.current_order_index);

        // もう未完了がなければカードは出さない
        if (safeIndex >= flat.length) return null;

        const currentId = flat[safeIndex];
        const currentTask = taskById.get(currentId) ?? null;

        // 念のためガード
        if (!currentTask || currentTask.completed) return null;

        return {
          kind: "project" as const,
          id: `project-${p.id}`,
          projectId: p.id,
          taskId: currentTask.id,
          projectName: p.title,
          title: currentTask.title,
          color: label?.color ?? "#BDBDBD",
          pinned: currentTask.is_fixed ?? false,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const soloCards = tasks
      .filter((t) => !t.project_id && !t.completed)
      .sort((a, b) => a.order_index - b.order_index)
      .map((t) => {
        const label = findLabel(labels, t.label_id);
        return {
          kind: "solo" as const,
          id: `solo-${t.id}`,
          projectId: null,
          taskId: t.id,
          projectName: "ソロタスク",
          title: t.title,
          color: label?.color ?? "#BDBDBD",
          pinned: t.is_fixed,
        };
      });

    return [...projectCards, ...soloCards];
  }, [projects, tasks, labels, flatIdsByProject, taskById]);

  const filteredCards = useMemo(() => {
    if (selectedLabelId === null) return cards;

    return cards.filter((c) => {
      if (!c.taskId) return false;
      const task = taskById.get(c.taskId);
      return task?.label_id === selectedLabelId;
    });
  }, [cards, selectedLabelId, taskById]);

  // ピン留め切り替え（保存はまだ行わない）
  const togglePin = (taskId: ID) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, is_fixed: !t.is_fixed, updated_at: now() } : t
      )
    );
  };

  const editingProject = useMemo(() => {
    if (!editingProjectId) return null;
    return projects.find((p) => p.id === editingProjectId) ?? null;
  }, [editingProjectId, projects]);

  const editingProjectTasks = useMemo(() => {
    if (!editingProjectId) return null;

    // プロジェクト内タスク（グループ含む）を order_index でソート
    return tasks
      .filter((t) => t.project_id === editingProjectId)
      .sort((a, b) => a.order_index - b.order_index);
  }, [editingProjectId, tasks]);

  // 完了処理：
  // - task.completed=true
  // - projectカードの場合は project.current_order_index を進める（+1）
  const completeTask = (card: (typeof cards)[number]) => {
    if (!card.taskId) return;

    // 1) タスク完了
    setTasks((prev) =>
      prev.map((t) =>
        t.id === card.taskId
          ? { ...t, completed: true, completed_at: now(), updated_at: now() }
          : t
      )
    );

    // 2) プロジェクトのcurrent_order_indexを進める
    if (card.kind === "project") {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== card.projectId) return p;

          return {
            ...p,
            current_order_index: p.current_order_index + 1,
            updated_at: now(),
          };
        })
      );
    }
  };

  return (
    <LabelRenameContext.Provider value={{ onRenameLabel: handleRenameLabel }}>
      <AppLayout
        labels={labels}
        selectedLabelId={selectedLabelId}
        onSelectLabel={setSelectedLabelId}
        onAddLabel={handleAddLabel}
        onUpdateLabelColor={handleUpdateLabelColor}
        onDeleteLabel={handleDeleteLabel}
      >
        <div className={styles.page}>
          <div className={styles.grid}>
            {filteredCards.map((c) => (
              <ProjectCard
                key={c.id}
                title={c.title}
                projectName={c.kind === "solo" ? "" : c.projectName}
                color={c.color}
                pinned={c.pinned}
                onTogglePin={() => c.taskId && togglePin(c.taskId)}
                onComplete={() => completeTask(c)}
                // ソロタスクをプロジェクトに変換する
                onConvertToProject={
                  c.kind === "solo"
                    ? () =>
                        openProjectFromSoloTask(
                          tasks.find((t) => t.id === c.taskId)!
                        )
                    : undefined
                }
                onClick={() => {
                  setEditingTaskId(c.taskId);
                  setTaskOpen(true);
                }}
                onClickProjectName={
                  c.kind === "project"
                    ? () => {
                        setEditingProjectId(c.projectId);
                        setProjectOpen(true);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <FabMenu
          onCreateTask={() => {
            setEditingTaskId(null);
            setTaskOpen(true);
          }}
          onCreateProject={() => {
            setEditingProjectId(null); // 新規作成
            setProjectOpen(true);
          }}
        />

        <TaskModal
          open={taskOpen}
          onClose={() => {
            setTaskOpen(false);
            setEditingTaskId(null);
          }}
          labels={labels}
          task={editingTaskId ? taskById.get(editingTaskId) ?? null : null}
          onDelete={(id) => {
            // 削除対象のタスクを取得（なければ何もしない）
            const target = taskById.get(id);
            if (!target) return;

            const projectId = target.project_id ?? null;

            // 削除前のflat配列で、削除タスクがどこにあったかを取得
            const beforeFlat =
              projectId ? (flatIdsByProject.get(projectId) ?? []) : [];
            const removedIndex = beforeFlat.indexOf(id);

            // 1) タスク削除
            setTasks((prev) => prev.filter((t) => t.id !== id));

            // 2) project.current_order_index の補正（削除位置が手前なら -1）
            if (projectId) {
              setProjects((prev) =>
                prev.map((p) => {
                  if (p.id !== projectId) return p;

                  const nextIndex =
                    removedIndex !== -1 && removedIndex < p.current_order_index
                      ? Math.max(0, p.current_order_index - 1)
                      : p.current_order_index;

                  return { ...p, current_order_index: nextIndex, updated_at: now() };
                })
              );
            }

            // 3) モーダル閉じる
            setTaskOpen(false);
            setEditingTaskId(null);
          }}
          onSave={(incoming) => {
            if (editingTaskId) {
              setTasks((prev) => prev.map((t) => (t.id === incoming.id ? incoming : t)));
            } else {
              setTasks((prev) => {
                const max = Math.max(
                  -1,
                  ...prev.filter((t) => !t.project_id).map((t) => t.order_index ?? 0)
                );
                return [...prev, { ...incoming, order_index: max + 1 }];
              });
            }
            setTaskOpen(false);
            setEditingTaskId(null);
          }}
        />

        <ProjectModal
          open={projectOpen}
          onClose={() => {
            setProjectOpen(false);
            setEditingProjectId(null);
            setConvertSoloTaskId(null);
            setConvertSoloTaskTitle("");
            setConvertSoloTaskMemo(null);
            setConvertSoloLabelId(null);
          }}
          labels={labels}
          project={editingProject}
          tasks={editingProjectTasks}
          // 新規作成時：ソロタスクをプロジェクト化する値
          convertTaskId={convertSoloTaskId}
          convertTaskTitle={convertSoloTaskTitle}
          convertTaskMemo={convertSoloTaskMemo}
          convertLabelId={convertSoloLabelId}
          onSave={(project, newTasks) => {
            // 既存プロジェクトの current_order_index を維持するため、保存前の状況を取得
            const prevProject = projects.find((p) => p.id === project.id) ?? null;
            const prevIndex = prevProject?.current_order_index ?? 0;
            const prevFlat = flatIdsByProject.get(project.id) ?? [];
            const prevCurrentTaskId = prevFlat[prevIndex] ?? null;

            // tasks更新（プロジェクトのタスクを置換）
            setTasks((prev) => {
              const withoutThisProject = prev.filter((t) => t.project_id !== project.id);

              const newIds = new Set(newTasks.map((t) => t.id));
              const withoutDupIds = withoutThisProject.filter((t) => !newIds.has(t.id));

              return [...withoutDupIds, ...newTasks];
            });

            // projects更新（存在すれば更新、なければ追加）
            setProjects((prev) => {
              const exists = prev.some((p) => p.id === project.id);

              const nextIndex =
                prevCurrentTaskId ? newTasks.findIndex((t) => t.id === prevCurrentTaskId) : -1;

              const safeIndex =
                nextIndex >= 0 ? nextIndex : Math.min(prevIndex, Math.max(0, newTasks.length - 1));

              const nextProject: Project = {
                ...project,
                current_order_index: safeIndex,
                updated_at: now(),
              };

              return exists
                ? prev.map((p) => (p.id === project.id ? nextProject : p))
                : [nextProject, ...prev];
            });

            setProjectOpen(false);
            setEditingProjectId(null);
            setConvertSoloTaskId(null);
            setConvertSoloTaskTitle("");
            setConvertSoloTaskMemo(null);
          }}
          onDelete={(projectId) => {
            // プロジェクト配下タスクを削除
            setTasks((prev) => prev.filter((t) => t.project_id !== projectId));
            // プロジェクトを削除
            setProjects((prev) => prev.filter((p) => p.id !== projectId));

            // モーダル閉じる
            setProjectOpen(false);
            setEditingProjectId(null);
            setConvertSoloTaskId(null);
            setConvertSoloTaskTitle("");
            setConvertSoloTaskMemo(null);
            setConvertSoloLabelId(null);
          }}
        />
      </AppLayout>
    </LabelRenameContext.Provider>
  );
}
