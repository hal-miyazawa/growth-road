
import styles from "./Sidebar.module.scss";

// ナビゲーション項目の定義と、タブキーの型
import { navItems, type TabKey } from "./navItems";

// Sidebarコンポーネントが受け取るpropsの型定義
type Props = {
  // 現在アクティブなタブ
  active: TabKey;

  // サイドバーが開いているかどうか
  open: boolean;

  // サイドバーを閉じる処理
  onClose: () => void;

  // タブが切り替わったときの処理
  onChange: (key: TabKey) => void;
};

// Sidebarコンポーネント本体
export default function Sidebar({ active, open, onClose, onChange }: Props) {
  return (
    <>
      {/* 
        サイドバーが開いている時だけ表示される背景（オーバーレイ）
        クリックするとサイドバーを閉じる
      */}
      {open && <div className={styles.backdrop} onClick={onClose} />}

      {/*
        サイドバー本体
        open が true の時は expanded（展開）
        false の時は collapsed（閉じた状態）
      */}
      <aside
        className={`${styles.sidebar} ${
          open ? styles.expanded : styles.collapsed
        }`}
      >
        {/* ナビゲーション領域 */}
        <nav className={styles.nav}>
          {/* navItems を元にボタンを動的生成 */}
          {navItems.map((item) => (
            <button
              // Reactでのリスト描画に必要なkey
              key={item.key}
              // アクティブなタブなら active クラスを付与
              className={`${styles.item} ${
                active === item.key ? styles.active : ""
              }`}
              // クリック時の処理
              onClick={() => {
                // タブを切り替える
                onChange(item.key);
                onClose();
              }}
              type="button"
              >
              {/* アイコン表示 */}
              <span className={styles.icon}>{item.icon}</span>

              {/* ラベル（テキスト）表示 */}
              <span className={styles.label}>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
