import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "../lib/api";
import AppLayout from "../layouts/AppLayout";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import styles from "./Dashboard.module.scss";
import FabMenu from "../components/FabMenu/FabMenu";
import TaskModal from "../components/TaskModal/TaskModal";
import ProjectModal from "../components/ProjectModal/ProjectModal";
import { LabelRenameContext } from "../components/Sidebar/Sidebar";
import type { ID, Label, Project, Task } from "../types/models";

const now = () => new Date().toISOString();

const legacyLabelNameById: Record<string, string> = {};

// --- mock用（本番では DB/API から取得する想定） ---
const initialProjects: Project[] = [];

const initialTasks: Task[] = [];

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
      let serverLabels: Label[] = [];
      try {
        serverLabels = await apiGet<Label[]>("/api/labels");
        setLabels(serverLabels);
      } catch (e) {
        console.error(e);
      }

      let serverProjects: Project[] | null = null;
      try {
        serverProjects = await apiGet<Project[]>("/api/projects");
      } catch (e) {
        console.error(e);
      }

      let serverTasks: Task[] | null = null;
      try {
        serverTasks = await apiGet<Task[]>("/api/tasks");
      } catch (e) {
        console.error(e);
      }

      // ?label_id?label-study?????????label.id??????
      const titleToId = new Map(serverLabels.map((l) => [l.title.trim(), l.id]));

      if (serverProjects) {
        const nextProjects =
          titleToId.size === 0
            ? serverProjects
            : serverProjects.map((p) => {
                const legacyName = p.label_id ? legacyLabelNameById[p.label_id] : null;
                const newId = legacyName ? titleToId.get(legacyName) : null;
                return newId ? { ...p, label_id: newId } : p;
              });
        setProjects(nextProjects);
      }

      if (serverTasks) {
        const nextTasks =
          titleToId.size === 0
            ? serverTasks
            : serverTasks.map((t) => {
                const legacyName = t.label_id ? legacyLabelNameById[t.label_id] : null;
                const newId = legacyName ? titleToId.get(legacyName) : null;
                return newId ? { ...t, label_id: newId } : t;
              });
        setTasks(nextTasks);
      }
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
          onDelete={async (id) => {
            // 削除対象のタスクを取得（なければ何もしない）
            const target = taskById.get(id);
            if (!target) return;

            const projectId = target.project_id ?? null;

            // 削除前のflat配列で、削除タスクがどこにあったかを取得
            const beforeFlat =
              projectId ? (flatIdsByProject.get(projectId) ?? []) : [];
            const removedIndex = beforeFlat.indexOf(id);

            try {
              await apiDelete(`/api/tasks/${id}`);
            } catch (e) {
              console.error(e);
              return;
            }

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
          onSave={async (incoming) => {
            if (editingTaskId) {
              const patchBody = {
                title: incoming.title,
                memo: incoming.memo ?? null,
                label_id: incoming.label_id ?? null,
                project_id: incoming.project_id ?? null,
                parent_task_id: incoming.parent_task_id ?? null,
                completed: incoming.completed,
                completed_at: incoming.completed_at ?? null,
                is_fixed: incoming.is_fixed ?? false,
                is_group: incoming.is_group ?? false,
                order_index: incoming.order_index,
              };

              try {
                const updated = await apiPatch<Task>(
                  `/api/tasks/${incoming.id}`,
                  patchBody
                );
                setTasks((prev) =>
                  prev.map((t) => (t.id === incoming.id ? updated : t))
                );
              } catch (e) {
                console.error(e);
              }

              setTaskOpen(false);
              setEditingTaskId(null);
              return;
            }

            const max = Math.max(
              -1,
              ...tasks.filter((t) => !t.project_id).map((t) => t.order_index ?? 0)
            );
            const payload = {
              title: incoming.title,
              memo: incoming.memo ?? null,
              label_id: incoming.label_id ?? null,
              project_id: incoming.project_id ?? null,
              parent_task_id: incoming.parent_task_id ?? null,
              order_index: max + 1,
              is_group: incoming.is_group ?? false,
              is_fixed: incoming.is_fixed ?? false,
            };

            try {
              const created = await apiPost<Task>("/api/tasks", payload);
              setTasks((prev) => [...prev, created]);
            } catch (e) {
              console.error(e);
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
          onSave={async (project, newTasks) => {
            const prevProject = projects.find((p) => p.id === project.id) ?? null;
            const prevIndex = prevProject?.current_order_index ?? 0;
            const prevFlat = flatIdsByProject.get(project.id) ?? [];
            const prevCurrentTaskId = prevFlat[prevIndex] ?? null;

            let savedProject: Project | null = null;
            let savedTasks: Task[] | null = null;

            try {
              const projectPayload = {
                title: project.title,
                label_id: project.label_id ?? null,
                current_order_index: project.current_order_index,
              };

              savedProject = prevProject
                ? await apiPatch<Project>(`/api/projects/${project.id}`, projectPayload)
                : await apiPost<Project>("/api/projects", projectPayload);

              const projectId = savedProject.id;
              const tasksPayload = newTasks.map((t) => ({
                ...t,
                project_id: projectId,
              }));

              savedTasks = await apiPut<Task[]>(
                `/api/projects/${projectId}/tasks`,
                tasksPayload
              );
            } catch (e) {
              console.error(e);
            }

            if (savedProject && savedTasks) {
              const projectId = savedProject.id;
              const nextIndex = prevCurrentTaskId
                ? savedTasks.findIndex((t) => t.id === prevCurrentTaskId)
                : -1;
              const safeIndex =
                nextIndex >= 0
                  ? nextIndex
                  : Math.min(prevIndex, Math.max(0, savedTasks.length - 1));

              const nextProject: Project = {
                ...savedProject,
                current_order_index: safeIndex,
              };

              setProjects((prev) => {
                const exists = prev.some((p) => p.id === projectId);
                return exists
                  ? prev.map((p) => (p.id === projectId ? nextProject : p))
                  : [nextProject, ...prev];
              });

              setTasks((prev) => {
                const withoutThisProject = prev.filter(
                  (t) => t.project_id !== projectId
                );
                return [...withoutThisProject, ...savedTasks];
              });
            }

            setProjectOpen(false);
            setEditingProjectId(null);
            setConvertSoloTaskId(null);
            setConvertSoloTaskTitle("");
            setConvertSoloTaskMemo(null);
          }}
          onDelete={async (projectId) => {
            let deleted = false;
            try {
              await apiDelete(`/api/projects/${projectId}`);
              deleted = true;
            } catch (e) {
              console.error(e);
            }

            if (deleted) {
              setTasks((prev) => prev.filter((t) => t.project_id !== projectId));
              setProjects((prev) => prev.filter((p) => p.id !== projectId));
            }

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
