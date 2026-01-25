import { useEffect, useRef, useState } from "react";
import styles from "./Header.module.scss";

type SortKey = "created_at" | "updated_at";

type HeaderProps = {
  title?: string;
  onMenuClick?: () => void;
  sortKey?: SortKey;
  onSortChange?: (key: SortKey) => void;

  // 将来のログイン導線用（今は console.log でもOK）
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  onAccountSettingsClick?: () => void;
  onLogoutClick?: () => void;
};

export default function Header({
  title = "GrowthRoad",
  onMenuClick,
  sortKey,
  onSortChange,
  onLoginClick,
  onSignupClick,
  onAccountSettingsClick,
  onLogoutClick,
}: HeaderProps) {
  const selectValue = sortKey ?? "updated_at";

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = e.target as Node;
      if (userMenuRef.current && userMenuRef.current.contains(el)) return;
      setUserMenuOpen(false);
    };

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [userMenuOpen]);

  // 今は mock_auth でログイン判定してる前提（将来ここは実認証に差し替え）
  const authed = localStorage.getItem("mock_auth") === "1";

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

        <button
          type="button"
          className={`${styles.iconBtn} ${styles.analysisBtn}`}
          aria-label="分析"
          onClick={() => console.log("analytics: todo")}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <polyline
              points="3 16 9 10 13 14 21 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="3" cy="16" r="1.5" fill="currentColor" />
            <circle cx="9" cy="10" r="1.5" fill="currentColor" />
            <circle cx="13" cy="14" r="1.5" fill="currentColor" />
            <circle cx="21" cy="6" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className={styles.right}>
        <select
          className={styles.select}
          aria-label="sort"
          value={selectValue}
          onChange={(e) => onSortChange?.(e.target.value as SortKey)}
        >
          <option value="updated_at">更新順</option>
          <option value="created_at">作成順</option>
        </select>

        {/* ユーザーアイコン + メニュー */}
        <div className={styles.userMenuWrap} ref={userMenuRef}>
          <button
            className={`${styles.iconBtn} ${styles.userBtn}`}
            aria-label="ユーザーメニュー"
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <span className={styles.userDot} aria-hidden="true" />
          </button>

          {userMenuOpen && (
            <div className={styles.userMenu} role="menu" aria-label="ユーザーメニュー">
              {!authed ? (
                <>
                  <button
                    type="button"
                    className={styles.userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLoginClick?.() ?? console.log("login: todo");
                    }}
                  >
                    ログイン
                  </button>
                  <button
                    type="button"
                    className={styles.userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignupClick?.() ?? console.log("signup: todo");
                    }}
                  >
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.userMenuItem}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onAccountSettingsClick?.() ?? console.log("account settings: todo");
                    }}
                  >
                    アカウント設定
                  </button>
                  <button
                    type="button"
                    className={`${styles.userMenuItem} ${styles.danger}`}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogoutClick?.() ?? console.log("logout: todo");
                    }}
                  >
                    ログアウト
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
