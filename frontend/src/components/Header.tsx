import styles from "./Header.module.scss";

type HeaderProps = {
  title?: string;
};

export default function Header({ title = "GrowthRoad" }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.iconBtn} aria-label="menu">☰</button>
        <span className={styles.title}>{title}</span>
      </div>

      <div className={styles.right}>
        <select className={styles.select} aria-label="view">
          <option>プロジェクト</option>
          <option>タスク</option>
        </select>
        <button className={styles.iconBtn} aria-label="settings">⚙</button>
      </div>
    </header>
  );
}
