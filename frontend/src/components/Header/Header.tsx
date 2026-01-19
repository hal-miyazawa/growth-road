import styles from "./Header.module.scss";

type HeaderProps = {
  title?: string;
  onMenuClick?: () => void; 
};

export default function Header({ title = "GrowthRoad", onMenuClick }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.iconBtn}
          aria-label="menu"
          onClick={onMenuClick} 
          type="button"
        >
          ☰
        </button>

        <span className={styles.title}>{title}</span>
      </div>

      <div className={styles.right}>
        <select className={styles.select} aria-label="view">
          <option>作成日</option>
          <option>更新日</option>
          <option>優先度順</option>
        </select>
        <button className={styles.iconBtn} aria-label="settings" type="button">
          ⚙
        </button>
      </div>
    </header>
  );
}
