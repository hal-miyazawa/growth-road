import { useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import styles from "./Dashboard.module.scss";
import FabMenu from "../components/FabMenu/FabMenu";
import TaskModal from "../components/TaskModal/TaskModal";
import ProjectModal from "../components/ProjectModal/ProjectModal";
import type { ID, Label, Project, Task } from "../types/models";

const now = () => new Date().toISOString();

// --- mock（あとでDB/APIに置き換える） ---
const initialLabels: Label[] = [
  { id: "label-study", name: "資格勉強", color: "#95A0E6", created_at: now() },
  { id: "label-home", name: "家事",  color: "#8AD08A", created_at: now() },
  { id: "label-work", name: "仕事", color: "#BDBDBD", created_at: now() },
];


const initialProjects: Project[] = [
  { id: "proj-study", name: "学習", label_id: "label-study", current_order_index: 0, created_at: now(), updated_at: now() },
  { id: "proj-home", name: "家事", label_id: "label-home", current_order_index: 0, created_at: now(), updated_at: now() },
];

const initialTasks: Task[] = [
  // 学習（ルート：1,2,3 / 2が子を持つ）
  { id: "t1", project_id: "proj-study", label_id:"label-study", parent_task_id: null, order_index: 0, title: "1. 参考書 1章", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t2", project_id: "proj-study", label_id: "label-study",parent_task_id: null, order_index: 1, title: "2. 模試（親）",memo: null, completed: false, completed_at: null, is_fixed: false,is_group: true,created_at: now(), updated_at: now()},
  { id: "t11", project_id: "proj-study", label_id:"label-study", parent_task_id: "t2", order_index: 0, title: "11. 模試A", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t12", project_id: "proj-study", label_id: "label-study", parent_task_id: "t2", order_index: 1, title: "12. 模試B", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "t3", project_id: "proj-study", label_id:"label-study", parent_task_id: null, order_index: 2, title: "3. 復習ノート", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },

  // 単体タスク（project_id=null：未完了なら全部表示）
  { id: "solo-1", project_id: null, label_id: "label-home", parent_task_id: null, order_index: 0, title: "ゴミ出し", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
  { id: "solo-2", project_id: null, label_id:"label-work", parent_task_id: null, order_index: 1, title: "役所の手続き", memo: null, completed: false, completed_at: null, is_fixed: false, created_at: now(), updated_at: now() },
];

// --- 平坦化：親(子持ち)は表示せず、子を差し込む（leafだけのID配列を返す） ---
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

      // ★グループは絶対に表示しない（子だけ潜って拾う）
      if (c.is_group) {
        if (grand && grand.length > 0) pushChildrenRec(c.id);
        continue;
      }

      // c がさらに子を持つなら c を表示せず、孫を差し込む（従来仕様）
      if (grand && grand.length > 0) {
        pushChildrenRec(c.id);
      } else {
        out.push(c.id);
      }
    }
  };

  for (const r of roots) {
    const children = childrenByParent.get(r.id);

    // ★rootがグループなら、root自体は表示せず子だけ
    if (r.is_group) {
      if (children && children.length > 0) pushChildrenRec(r.id);
      continue;
    }

    if (children && children.length > 0) {
      // 親(r)は表示せず子を差し込む（従来仕様）
      pushChildrenRec(r.id);
    } else {
      // leaf なら表示（ただし group は上で弾いてる）
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
  const [selectedLabelId, setSelectedLabelId] = useState<ID | null>(null);
  

  // DB/APIに置き換える時も、ここを置き換えるだけでOKな形
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  //編集モーダル用タスクのid
  const [editingTaskId, setEditingTaskId] = useState<ID | null>(null);

  // task参照用
  const taskById = useMemo(() => new Map<ID, Task>(tasks.map((t) => [t.id, t])), [tasks]);

  // プロジェクトごとの平坦化リスト
  const flatIdsByProject = useMemo(() => {
    const map = new Map<ID, ID[]>();
    for (const p of projects) {
      map.set(p.id, buildFlatLeafTaskIds(tasks, p.id));
    }
    return map;
  }, [projects, tasks]);

  const uid = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());

  const handleAddLabel = (name: string) => {
    const ts = now();

    // かぶり防止（同名は弾く or 末尾に(2)つける等。今は弾くでOK）
    const exists = labels.some((l) => l.name.trim() === name.trim());
    if (exists) return;

    const newLabel: Label = {
      id: `label-${uid()}` as ID,
      name: name.trim(),
      color: "#BDBDBD",     // 今は仮（あとで選択式にする）
      created_at: ts,
    };

    setLabels((prev) => [...prev, newLabel]);
  };

  // 「次の未完了」まで index を進める（完了済みが混ざっても詰まらない）
  const advanceProjectIndexToNextUncompleted = (projectId: ID, fromIndex: number) => {
    const flat = flatIdsByProject.get(projectId) ?? [];
    let idx = fromIndex;

    while (idx < flat.length) {
      const t = taskById.get(flat[idx]);
      if (t && !t.completed) return idx;
      idx += 1;
    }
    return flat.length; // 次が無い（カードは “次のタスクなし” 表示になる）
  };

  // カード表示用VM
  const cards = useMemo(() => {
const projectCards = projects
  .map((p) => {
    const label = findLabel(labels, p.label_id);
    const flat = flatIdsByProject.get(p.id) ?? [];

    // current_order_index を未完了へ補正
    const safeIndex = advanceProjectIndexToNextUncompleted(p.id, p.current_order_index);

    // ✅ 未完了がもう無い（=完了済み）なら総合画面に出さない
    if (safeIndex >= flat.length) return null;

    const currentId = flat[safeIndex];
    const currentTask = taskById.get(currentId) ?? null;

    // 念のため：currentTaskが取れない/完了済みなら出さない
    if (!currentTask || currentTask.completed) return null;

    return {
      kind: "project" as const,
      id: `project-${p.id}`,
      projectId: p.id,
      taskId: currentTask.id, // ← これだけでOK（currentTaskはnullじゃないので）
      projectName: p.name,
      title: currentTask.title,
      color: label?.color ?? "#BDBDBD",
      pinned: currentTask.is_fixed ?? false,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

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
          projectName: "プロジェクト化",
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

  // ピン切替：いま表示してるタスク（or 単体タスク）の is_fixed をトグル
  const togglePin = (taskId: ID) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, is_fixed: !t.is_fixed, updated_at: now() } : t
      )
    );
  };

  // 完了：単体タスクは completed=true（表示から消える）
  //      プロジェクトタスクは completed=true ＋ project.current_order_index を次へ
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

    // 2) プロジェクトなら次へ進める
    if (card.kind === "project") {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== card.projectId) return p;

          // 完了したら基本は +1 して次へ（さらに “次の未完了” へ補正は cards 側で入ってる）
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
    <AppLayout
      labels={labels}
      selectedLabelId={selectedLabelId}
      onSelectLabel={setSelectedLabelId}
      onAddLabel={handleAddLabel}
    >
      <div className={styles.page}>
        <div className={styles.grid}>
          {filteredCards.map((c) => (
            <ProjectCard
              key={c.id}
              title={c.title}
              projectName={c.kind === "solo" ? "" : c.projectName}   // ★soloは空
              topHoverText={c.kind === "solo" ? "＋" : undefined} // ★soloだけ
              color={c.color}
              pinned={c.pinned}
              onTogglePin={() => c.taskId && togglePin(c.taskId)}
              onComplete={() => completeTask(c)}
              onClick={() => {
                setEditingTaskId(c.taskId);
                setTaskOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      <FabMenu
        onCreateTask={() => {
          setEditingTaskId(null);   // ★これ入れる
          setTaskOpen(true);
        }}
        onCreateProject={() => setProjectOpen(true)}
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
          // --- 削除対象を「今の状態」から取得 ---
          const target = taskById.get(id);
          if (!target) return;

          const projectId = target.project_id ?? null;

          // --- 削除前の flat で「消した位置」を求める（index補正用） ---
          const beforeFlat =
            projectId ? (flatIdsByProject.get(projectId) ?? []) : [];
          const removedIndex = beforeFlat.indexOf(id);

          // 1) タスク削除
          setTasks((prev) => prev.filter((t) => t.id !== id));

          // 2) project タスクなら current_order_index を補正
          if (projectId) {
            setProjects((prev) =>
              prev.map((p) => {
                if (p.id !== projectId) return p;

                // 消したのが「今より前」なら index を 1戻す
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
        onClose={() => setProjectOpen(false)}
        onSave={(project, newTasks) => {
          setProjects((prev) => [...prev, project]);
          setTasks((prev) => [...prev, ...newTasks]);
        }}
      />
    </AppLayout>
  );
}
