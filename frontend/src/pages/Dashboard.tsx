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

type SortKey = "created_at" | "updated_at";
type AnalyticsPeriod = "7d" | "30d";
type DemoAnalyticsRecord = {
  id: string;
  labelTitle: string;
  dueOffsetDays: number;
  completedOffsetDays: number | null;
};
type DemoProgressSummary = {
  completionRate: number;
  completed: number;
  pending: number;
  overdue: number;
  label: string;
};

const now = () => new Date().toISOString();
const DAY_MS = 24 * 60 * 60 * 1000;

const legacyLabelNameById: Record<string, string> = {};
const demoAnalyticsRecords: DemoAnalyticsRecord[] = [
  { id: "a-1", labelTitle: "学習", dueOffsetDays: -18, completedOffsetDays: -19 },
  { id: "a-2", labelTitle: "学習", dueOffsetDays: -16, completedOffsetDays: -16 },
  { id: "a-3", labelTitle: "生活", dueOffsetDays: -14, completedOffsetDays: -13 },
  { id: "a-4", labelTitle: "仕事", dueOffsetDays: -12, completedOffsetDays: -11 },
  { id: "a-5", labelTitle: "学習", dueOffsetDays: -10, completedOffsetDays: -9 },
  { id: "a-6", labelTitle: "資格", dueOffsetDays: -8, completedOffsetDays: -8 },
  { id: "a-7", labelTitle: "生活", dueOffsetDays: -7, completedOffsetDays: -6 },
  { id: "a-8", labelTitle: "学習", dueOffsetDays: -6, completedOffsetDays: -5 },
  { id: "a-9", labelTitle: "仕事", dueOffsetDays: -5, completedOffsetDays: null },
  { id: "a-10", labelTitle: "学習", dueOffsetDays: -4, completedOffsetDays: -4 },
  { id: "a-11", labelTitle: "生活", dueOffsetDays: -3, completedOffsetDays: null },
  { id: "a-12", labelTitle: "学習", dueOffsetDays: -2, completedOffsetDays: -2 },
  { id: "a-13", labelTitle: "資格", dueOffsetDays: -1, completedOffsetDays: -1 },
  { id: "a-14", labelTitle: "仕事", dueOffsetDays: 1, completedOffsetDays: null },
  { id: "a-15", labelTitle: "学習", dueOffsetDays: 2, completedOffsetDays: null },
  { id: "a-16", labelTitle: "生活", dueOffsetDays: 4, completedOffsetDays: null },
  { id: "a-17", labelTitle: "学習", dueOffsetDays: 6, completedOffsetDays: null },
  { id: "a-18", labelTitle: "資格", dueOffsetDays: 9, completedOffsetDays: null },
  { id: "a-19", labelTitle: "仕事", dueOffsetDays: 12, completedOffsetDays: null },
  { id: "a-20", labelTitle: "学習", dueOffsetDays: 16, completedOffsetDays: null },
  { id: "a-21", labelTitle: "生活", dueOffsetDays: 20, completedOffsetDays: null },
  { id: "a-22", labelTitle: "学習", dueOffsetDays: 24, completedOffsetDays: null },
  { id: "a-23", labelTitle: "資格", dueOffsetDays: 27, completedOffsetDays: null },
  { id: "a-24", labelTitle: "仕事", dueOffsetDays: 29, completedOffsetDays: null },
];
const demoProgressSummaryByPeriod: Record<AnalyticsPeriod, DemoProgressSummary> = {
  "7d": {
    completionRate: 70,
    completed: 7,
    pending: 3,
    overdue: 2,
    label: "直近7日",
  },
  "30d": {
    completionRate: 90,
    completed: 27,
    pending: 3,
    overdue: 1,
    label: "直近30日",
  },
};
const demoTrendCountsByPeriod: Record<AnalyticsPeriod, number[]> = {
  "7d": [0, 3, 1, 4, 0, 2, 4],
  "30d": [
    0, 2, 1, 4, 0, 3, 2, 1, 4, 2,
    0, 3, 1, 2, 4, 0, 2, 3, 1, 4,
    2, 0, 3, 1, 2, 4, 1, 0, 3, 2,
  ],
};

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function Dashboard() {
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<ID | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<ID | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "history" | "analytics">("active");
  const [historyMenuOpenId, setHistoryMenuOpenId] = useState<ID | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("7d");
  const [progressPeriod, setProgressPeriod] = useState<AnalyticsPeriod>("7d");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
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
  const [analyticsAnchor] = useState(() => startOfDay(new Date()));

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

  const handleSelectLabel = (id: ID | null) => {
    setSelectedLabelId(id);
    setViewMode("active");
    setHistoryMenuOpenId(null);
  };

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

  const sortedCards = useMemo(() => {
    const getTime = (taskId?: ID | null) => {
      if (!taskId) return 0;
      const task = taskById.get(taskId);
      if (!task) return 0;
      const value = sortKey === "created_at" ? task.created_at : task.updated_at;
      if (!value) return 0;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return [...filteredCards].sort((a, b) => getTime(b.taskId) - getTime(a.taskId));
  }, [filteredCards, sortKey, taskById]);

  const historyCards = useMemo(() => {
    const labelById = new Map(labels.map((l) => [l.id, l]));
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const toTime = (value?: string | null) => {
      if (!value) return Number.NEGATIVE_INFINITY;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
    };

    return tasks
      .filter((t) => t.completed)
      .sort((a, b) => toTime(b.completed_at) - toTime(a.completed_at))
      .map((t) => {
        const label = t.label_id ? labelById.get(t.label_id) : null;
        const project = t.project_id ? projectById.get(t.project_id) : null;

        return {
          id: t.id,
          title: t.title,
          projectName: project?.title ?? "ソロ",
          color: label?.color ?? "#BDBDBD",
          pinned: t.is_fixed ?? false,
        };
      });
  }, [tasks, labels, projects]);

  const analytics = useMemo(() => {
    const anchorMs = analyticsAnchor.getTime();
    const periodDays = analyticsPeriod === "7d" ? 7 : 30;
    const records = demoAnalyticsRecords.map((record) => ({
      ...record,
      dueAt: anchorMs + record.dueOffsetDays * DAY_MS,
      completedAt:
        record.completedOffsetDays === null
          ? null
          : anchorMs + record.completedOffsetDays * DAY_MS,
    }));
    const completedLast7 = records.filter((record) => {
      if (record.completedAt === null) return false;
      return record.completedAt >= anchorMs - 6 * DAY_MS && record.completedAt < anchorMs + DAY_MS;
    }).length;
    const totalCompleted = records.filter((record) => record.completedAt !== null).length;
    const activeCount = records.filter((record) => record.completedAt === null).length;

    const labelCompletedCounts = new Map<string, number>();
    for (const record of records) {
      if (record.completedAt === null) continue;
      labelCompletedCounts.set(
        record.labelTitle,
        (labelCompletedCounts.get(record.labelTitle) ?? 0) + 1
      );
    }

    const topLabelEntry =
      [...labelCompletedCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["未分類", 0];

    const demoTrendCounts = demoTrendCountsByPeriod[analyticsPeriod];
    const trendPoints = Array.from({ length: periodDays }, (_, index) => {
      const dayStart = anchorMs - (periodDays - 1 - index) * DAY_MS;

      return {
        key: `${periodDays}-${index}`,
        label: new Date(dayStart).toLocaleDateString("ja-JP", {
          month: "numeric",
          day: "numeric",
        }),
        count: demoTrendCounts[index] ?? 0,
      };
    });

    const maxTrendCount = Math.max(1, ...trendPoints.map((point) => point.count));
    const chartPoints = trendPoints.map((point, index) => {
      const x = trendPoints.length === 1 ? 50 : (index / (trendPoints.length - 1)) * 100;
      const y = 88 - (point.count / maxTrendCount) * 64;
      return { ...point, x, y };
    });
    const progressSummary = demoProgressSummaryByPeriod[progressPeriod];
    const insight =
      progressSummary.overdue > 0
        ? `期限を過ぎた未完了タスクが ${progressSummary.overdue} 件あるので、少しだけタスクが溜まり気味です。`
        : `最近の完了ペースはいい感じです。${analyticsPeriod === "7d" ? "この1週間" : "ここ1か月"}も比較的安定して進められています！`;
    const nextAction =
      progressSummary.pending >= progressSummary.completed
        ? "まずはすぐ終わりそうなタスクを1つ片づけると、流れを戻しやすいです。"
        : `今よく進んでいる「${topLabelEntry[0]}」の流れはそのままで大丈夫です。次は学校ラベルに手をつけると、全体のバランスが良くなります！`;

    return {
      insight,
      nextAction,
      completedLast7,
      totalCompleted,
      activeCount,
      topLabelTitle: topLabelEntry[0],
      topLabelCount: topLabelEntry[1],
      progressSummary,
      trendPoints,
      chartPoints,
      maxTrendCount,
    };
  }, [analyticsAnchor, analyticsPeriod, progressPeriod]);

  useEffect(() => {
    if (!historyMenuOpenId) return;

    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-history-menu="true"]')) return;
      setHistoryMenuOpenId(null);
    };

    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [historyMenuOpenId]);

  // ピン留め切り替え（保存はまだ行わない）
  const togglePin = (taskId: ID) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, is_fixed: !t.is_fixed, updated_at: now() } : t
      )
    );
  };

  const handleRestoreHistoryTask = async (taskId: ID) => {
    try {
      const updated = await apiPatch<Task>(`/api/tasks/${taskId}`, {
        completed: false,
        completed_at: null,
      });

      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setHistoryMenuOpenId(null);

      if (updated.project_id) {
        const flat = flatIdsByProject.get(updated.project_id) ?? [];
        const restoredIndex = flat.indexOf(updated.id);
        if (restoredIndex !== -1) {
          setProjects((prev) =>
            prev.map((p) => {
              if (p.id !== updated.project_id) return p;
              const nextIndex = Math.min(p.current_order_index, restoredIndex);
              return nextIndex === p.current_order_index
                ? p
                : { ...p, current_order_index: nextIndex, updated_at: now() };
            })
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteHistoryTask = async (taskId: ID) => {
    try {
      await apiDelete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setHistoryMenuOpenId(null);
    } catch (e) {
      console.error(e);
    }
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
  const completeTask = async (card: (typeof cards)[number]) => {
    if (!card.taskId) return;

    const ts = now();
    try {
      const updated = await apiPatch<Task>(`/api/tasks/${card.taskId}`, {
        completed: true,
        completed_at: ts,
      });

      // 1) タスク完了
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <LabelRenameContext.Provider value={{ onRenameLabel: handleRenameLabel }}>
      <AppLayout
        labels={labels}
        selectedLabelId={selectedLabelId}
        onSelectLabel={handleSelectLabel}
        onAddLabel={handleAddLabel}
        onUpdateLabelColor={handleUpdateLabelColor}
        onDeleteLabel={handleDeleteLabel}
        sortKey={sortKey}
        onSortChange={setSortKey}
        onOpenHistory={() => {
          setHistoryMenuOpenId(null);
          setViewMode("history");
        }}
        onOpenAnalytics={() => {
          setHistoryMenuOpenId(null);
          setViewMode("analytics");
        }}
      >
        <div
          className={
            viewMode === "analytics"
              ? `${styles.page} ${styles.pageAnalytics}`
              : styles.page
          }
        >
          {viewMode === "analytics" ? (
            <section className={styles.analytics}>
              <div className={styles.analyticsHero}>
                <p className={styles.analyticsEyebrow}>ANALYTICS</p>
                <div className={styles.analyticsAdviceGroup}>
                  <p className={styles.analyticsAdvice}>
                    <strong>今の傾向</strong>
                    <span>{analytics.insight}</span>
                  </p>
                  <p className={styles.analyticsAdvice}>
                    <strong>次の一手</strong>
                    <span>{analytics.nextAction}</span>
                  </p>
                </div>
              </div>

              <div className={styles.analyticsCards}>
                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>今週の完了数</p>
                  <strong className={styles.metricValue}>{analytics.completedLast7}</strong>
                </article>

                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>累計完了数</p>
                  <strong className={styles.metricValue}>{analytics.totalCompleted}</strong>
                </article>

                <article className={styles.metricCard}>
                  <p className={styles.metricLabel}>一番進んでいる領域</p>
                  <strong className={styles.metricValue}>{analytics.topLabelTitle}</strong>
                  <span className={styles.metricSub}>{analytics.topLabelCount} 件完了</span>
                </article>
              </div>

              <div className={styles.analyticsRow}>
                <section className={styles.progressCard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <p className={styles.sectionEyebrow}>PROGRESS</p>
                      <h3 className={styles.sectionTitle}>期間達成率</h3>
                    </div>
                    <select
                      className={styles.chartSelect}
                      aria-label="達成率の期間"
                      value={progressPeriod}
                      onChange={(e) => setProgressPeriod(e.target.value as AnalyticsPeriod)}
                    >
                      <option value="7d">直近7日</option>
                      <option value="30d">直近30日</option>
                    </select>
                  </div>

                  <div className={styles.progressNumbers}>
                    <strong>{analytics.progressSummary.completionRate}%</strong>
                    <span>
                      完了 {analytics.progressSummary.completed} / 未完了 {analytics.progressSummary.pending}
                    </span>
                  </div>

                  <div className={styles.progressBar} aria-label="期間達成率">
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${analytics.progressSummary.completionRate}%` }}
                    />
                  </div>

                  <p className={styles.progressNote}>
                    期間内に未完了のタスクが {analytics.progressSummary.pending} 件あります
                  </p>

                  {analytics.progressSummary.overdue > 0 && (
                    <p className={styles.progressAlert}>
                      ※期限を過ぎた未完了タスクが {analytics.progressSummary.overdue} 件あります
                    </p>
                  )}
                </section>

                <section className={styles.chartCard}>
                  <div className={styles.sectionHead}>
                    <div>
                      <p className={styles.sectionEyebrow}>TREND</p>
                      <h3 className={styles.sectionTitle}>完了推移</h3>
                    </div>
                    <select
                      className={styles.chartSelect}
                      aria-label="分析期間"
                      value={analyticsPeriod}
                      onChange={(e) => setAnalyticsPeriod(e.target.value as AnalyticsPeriod)}
                    >
                      <option value="7d">直近7日</option>
                      <option value="30d">直近30日</option>
                    </select>
                  </div>

                  <div className={styles.chartFrame}>
                    <svg
                      className={styles.chartSvg}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <polyline
                        className={styles.chartLine}
                        points={analytics.chartPoints
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")}
                      />
                    </svg>

                    {analytics.chartPoints.map((point) => {
                      return (
                        <div
                          key={point.key}
                          className={styles.chartPointWrap}
                          style={{
                            left: `${point.x}%`,
                            top: `${point.y}%`,
                          }}
                        >
                          <span className={styles.chartValue}>{point.count}</span>
                        </div>
                      );
                    })}

                    <div className={styles.chartXAxis}>
                      {analytics.chartPoints.map((point, index) => {
                        const showLabel =
                          analyticsPeriod === "7d" ||
                          index === analytics.chartPoints.length - 1 ||
                          index % 5 === 0;

                        return (
                          <span
                            key={`${point.key}-label`}
                            className={styles.chartTick}
                            style={{ left: `${point.x}%` }}
                          >
                            {showLabel ? point.label : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            </section>
          ) : (
            <div className={styles.grid}>
              {viewMode === "history"
              ? historyCards.map((c) => (
                  <ProjectCard
                    key={c.id}
                    title={c.title}
                    projectName={c.projectName}
                    color={c.color}
                    pinned={c.pinned}
                    mode="history"
                    topRightSlot={
                      <div
                        className={styles.historyMenuWrap}
                        data-history-menu="true"
                      >
                        <button
                          type="button"
                          className={styles.historyMenuBtn}
                          aria-label="履歴メニュー"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryMenuOpenId((prev) =>
                              prev === c.id ? null : c.id
                            );
                          }}
                        >
                          ⋮
                        </button>
                        {historyMenuOpenId === c.id && (
                          <div className={styles.historyMenuList}>
                            <button
                              type="button"
                              className={styles.historyMenuItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRestoreHistoryTask(c.id);
                              }}
                            >
                              復元
                            </button>
                            <button
                              type="button"
                              className={
                                `${styles.historyMenuItem} ${styles.historyMenuDanger}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteHistoryTask(c.id);
                              }}
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    }
                  />
                ))
              : sortedCards.map((c) => (
                  <ProjectCard
                    key={c.id}
                    title={c.title}
                    projectName={c.kind === "solo" ? "" : c.projectName}
                    color={c.color}
                    pinned={c.pinned}
                    onTogglePin={() => c.taskId && togglePin(c.taskId)}
                    onComplete={() => completeTask(c)}
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
          )}
        </div>

        {viewMode === "active" && (
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
        )}

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
