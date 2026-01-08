export type TabKey = "home" | "study" | "work" | "house" | "history";

export const navItems: { key: TabKey; label: string; icon: string }[] = [
  { key: "home", label: "総合", icon: "▦" },
  { key: "study", label: "資格勉強", icon: "✎" },
  { key: "work", label: "仕事", icon: "💼" },
  { key: "house", label: "家事", icon: "☕" },
  { key: "history", label: "履歴", icon: "⟲" },
];
