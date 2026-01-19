import { useState } from "react";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import type { ID, Label } from "../types/models";

type Props = {
  children: React.ReactNode;

  labels: Label[];
  selectedLabelId: ID | null;
  onSelectLabel: (id: ID | null) => void;

  // ★色も受け取る
  onAddLabel: (name: string, color: string | null) => void;

  // ★色更新
  onUpdateLabelColor: (id: ID, color: string) => void;
};

export default function AppLayout({
  children,
  labels,
  selectedLabelId,
  onSelectLabel,
  onAddLabel,
  onUpdateLabelColor,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Header title="GrowthRoad" onMenuClick={() => setOpen((v) => !v)} />

      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        labels={labels}
        selectedLabelId={selectedLabelId}
        onSelectLabel={onSelectLabel}
        onAddLabel={onAddLabel}
        onUpdateLabelColor={onUpdateLabelColor}
        onOpenHistory={() => console.log("history")}
      />

      <main>{children}</main>
    </>
  );
}
