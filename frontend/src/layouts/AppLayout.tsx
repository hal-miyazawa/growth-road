import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import type { ID, Label } from "../types/models";

type SortKey = "created_at" | "updated_at";

type Props = {
  children: ReactNode;

  labels: Label[];
  selectedLabelId: ID | null;
  onSelectLabel: (id: ID | null) => void;

  // ★色も受け取る
  onAddLabel: (title: string, color: string | null) => void;

  // ★色更新
  onUpdateLabelColor: (id: ID, color: string) => void;

  onDeleteLabel?: (id: ID) => void; // ★追加

  sortKey?: SortKey;
  onSortChange?: (key: SortKey) => void;

  onOpenHistory?: () => void;
};

export default function AppLayout({
  children,
  labels,
  selectedLabelId,
  onSelectLabel,
  onAddLabel,
  onUpdateLabelColor,
  onDeleteLabel, // ★追加
  sortKey,
  onSortChange,
  onOpenHistory,
}: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Header
        title="GrowthRoad"
        onMenuClick={() => setOpen((v) => !v)}
        sortKey={sortKey}
        onSortChange={onSortChange}
        onLoginClick={() => navigate("/login")}
        onSignupClick={() => navigate("/signup")}
        onLogoutClick={() => {
          localStorage.removeItem("mock_auth");
          navigate("/login");
        }}
      />

      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        labels={labels}
        selectedLabelId={selectedLabelId}
        onSelectLabel={onSelectLabel}
        onAddLabel={onAddLabel}
        onUpdateLabelColor={onUpdateLabelColor}
        onOpenHistory={onOpenHistory}
        onDeleteLabel={onDeleteLabel} // ★ここ追加
      />

      <main>{children}</main>
    </>
  );
}