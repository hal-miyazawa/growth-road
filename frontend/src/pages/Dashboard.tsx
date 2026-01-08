import { useState } from "react";
import AppLayout from "../layouts/AppLayout";
import ProjectCard from "../components/ProjectCard/ProjectCard";
import styles from "./Dashboard.module.scss";
import FabMenu from "../components/FabMenu/FabMenu";
import TaskModal from "../components/TaskModal/TaskModal";
import ProjectModal from "../components/ProjectModal/ProjectModal";

const mockProjects = [
  { id: 1, title: "勉強", projectName: "資格勉強", color: "#95A0E6" },
  { id: 2, title: "過去問", projectName: "資格勉強", color: "#F36D6D" },
  { id: 3, title: "掃除", projectName: "家事", color: "#8AD08A" },
  { id: 4, title: "料理", projectName: "家事", color: "#8AD08A" },
  { id: 5, title: "画面設計", projectName: "仕事", color: "#BDBDBD" },
  { id: 6, title: "ああ", projectName: "仕事", color: "#8FE0DD" },
];

export default function Dashboard() {
  const [taskOpen, setTaskOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  return (
    <AppLayout>
      <div className={styles.page}>
        <div className={styles.grid}>
          {mockProjects.map((p) => (
            <ProjectCard
              key={p.id}
              title={p.title}
              projectName={p.projectName}
              color={p.color}
            />
          ))}
        </div>
      </div>

      <FabMenu
        onCreateTask={() => setTaskOpen(true)}
        onCreateProject={() => setProjectOpen(true)}
      />

      <TaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onSave={() => setTaskOpen(false)}
        onDelete={() => setTaskOpen(false)}
      />

      <ProjectModal open={projectOpen} onClose={() => setProjectOpen(false)} />
    </AppLayout>
  );
}
