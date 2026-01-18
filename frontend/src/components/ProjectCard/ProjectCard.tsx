import type { KeyboardEventHandler } from "react";
import styles from "./ProjectCard.module.scss";

type Props = {
  title: string;
  projectName: string;
  color?: string;
  pinned?: boolean;
  onClick?: () => void;

  onTogglePin?: () => void;
  onComplete?: () => void;

  // ★追加：プロジェクト名クリック（編集用）
  onClickProjectName?: () => void;

    // ★追加：project無しカードの「＋」用
  onClickPlus?: () => void;
  isSolo?: boolean; // projectNameが空のとき true を渡す
  onConvertToProject?: () => void;
};

export default function ProjectCard({
  title,
  projectName,
  color = "#bdbdbd",
  pinned = false,
  onClick,
  onTogglePin,
  onComplete,
  onClickProjectName, // ★追加
  onConvertToProject,
}: Props) {
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
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
    <div className={styles.top} style={{ backgroundColor: color }}>
      {/* 左上：projectNameがある→編集、ない→＋ */}
      {projectName ? (
        <button
          type="button"
          className={styles.topLeft}
          onClick={(e) => {
            e.stopPropagation();
            onClickProjectName?.();
          }}
        >
          {projectName}
        </button>
      ) : (
        <button
          type="button"
          className={styles.topLeft}
          data-variant="plus"
          aria-label="プロジェクト化"
          onClick={(e) => {
            e.stopPropagation();
            onConvertToProject?.();
          }}
        >
          ＋
        </button>
      )}

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

      <div className={styles.title}>{title}</div>

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
