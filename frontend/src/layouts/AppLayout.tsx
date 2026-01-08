import { useState } from "react";
import Header from "../components/Header/Header"; 
import Sidebar from "../components/Sidebar/Sidebar";
import type { TabKey } from "../components/Sidebar/navItems";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>("home");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Header title="GrowthRoad"  onMenuClick={() => setOpen((v) => !v)} />

      <Sidebar
        active={tab}
        open={open}
        onClose={() => setOpen(false)}
        onChange={setTab}
      />

      {/* ここが大事：children を出す */}
      <main>
        {children}
      </main>
    </>
  );
}
