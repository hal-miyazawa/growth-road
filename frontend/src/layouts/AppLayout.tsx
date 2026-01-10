import { useState } from "react";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import type { ID, Label } from "../types/models";

type Props = {
  children: React.ReactNode;

  // ラベルフィルタ（Dashboardから渡す）
  labels: Label[];
  selectedLabelId: ID | null;
  onSelectLabel: (id: ID | null) => void;
  onAddLabel: (name: string) => void;

  // （任意）履歴を開く処理を外から渡したいなら追加できる
  // onOpenHistory?: () => void;
};

export default function AppLayout({
  children,
  labels,
  selectedLabelId,
  onSelectLabel,
  onAddLabel,
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
        onAddLabel={(name) => {
          onAddLabel(name);
          // 追加後もサイドバーは閉じない（入力継続しやすい）
          // 閉じたいなら setOpen(false) を入れる
        }}
        onOpenHistory={() => {
          console.log("history");
        }}
      />

      <main>{children}</main>
    </>
  );
}
