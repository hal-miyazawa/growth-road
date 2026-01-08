import styles from "./ProjectCard.module.scss";

type Props = {
  title: string;
  projectName: string;
  color?: string;
  pinned?: boolean;
  onClick?: () => void;

  onTogglePin?: () => void;
  onOpenTree?: () => void;
  onComplete?: () => void;
};

export default function ProjectCard({
  title,
  projectName,
  color = "#bdbdbd",
  pinned = false,
  onClick,
  onTogglePin,
  onOpenTree,
  onComplete,
}: Props) {
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* 上の色バー */}
      <div className={styles.top} style={{ backgroundColor: color }}>
        {/* 左上：プロジェクト名 */}
        <div className={styles.topLeft}>{projectName}</div>

        {/* 右上：ピン */}
        <button
          type="button"
          className={styles.pinBtn}
          aria-label="ピン"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin?.();
          }}
          data-active={pinned ? "1" : "0"}
        >
          <PinIcon />
        </button>
      </div>

      {/* 中央タイトル（常に表示） */}
      <div className={styles.title}>{title}</div>

      {/* 左下：ツリー */}
      <button
        type="button"
        className={styles.bottomLeftBtn}
        aria-label="ツリー"
        onClick={(e) => {
          e.stopPropagation();
          onOpenTree?.();
        }}
      >
        <TreeIcon />
      </button>

      {/* 右下：完了チェック */}
      <button
        type="button"
        className={styles.bottomRightBtn}
        aria-label="完了"
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.();
        }}
      >
        <CheckIcon />
      </button>
    </div>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M14 2H10v5.2L7 10v2h10v-2l-3-2.8V2zM12 14v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
      <path
        d="M6 6h7M6 12h12M6 18h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M6 6v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M14 6v6M18 12v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.checkIcon} aria-hidden="true">
      <path
        d="M7 12l3 3 7-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}