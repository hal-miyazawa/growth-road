import { useState } from "react";
import styles from "./FabMenu.module.scss";

// FabMenu が外部（親コンポーネント）から受け取る props
type Props = {
  // 「新規タスク作成」が押されたときに呼ばれる処理
  // 親が何をするかを決める（FabMenu 自体は中身を知らない）
  onCreateTask?: () => void;

  // 「新規プロジェクト作成」が押されたときに呼ばれる処理
  onCreateProject?: () => void;
};

export default function FabMenu({ onCreateTask, onCreateProject }: Props) {
  // メニューが「クリックで固定表示」されているかどうか
  // true  = 開いたまま
  // false = 通常状態
  const [open, setOpen] = useState(false);

  // マウスが FAB 周辺に乗っている間だけ表示するための状態
  // プレビュー用途（クリックしなくても一時的に見せる）
  const [hover, setHover] = useState(false);

  // メニューを表示するかどうかの判定
  // クリックで固定されている OR ホバー中なら表示
  const visible = open || hover;

  // メニューを完全に閉じる共通処理
  // ・背景クリック
  // ・メニュー項目クリック
  // のどちらからも呼ばれる
  const close = () => {
    setOpen(false);
    setHover(false);
  };

  return (
    <>
      {/* 
        メニューが「固定表示(open)」されているときだけ表示する背景
        画面のどこかをクリックすると close() が呼ばれてメニューが閉じる
      */}
      {open && <div className={styles.backdrop} onClick={close} />}

      {/* 
        FAB とメニューをまとめるラッパー
        マウスが入ったら hover=true（プレビュー表示）
        マウスが出たら hover=false
      */}
      <div
        className={styles.wrap}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* 
          visible が true のときだけメニューを描画
          （open または hover のどちらか）
        */}
        {visible && (
          <div
            className={styles.menu}
            role="menu"
            aria-label="作成メニュー"
          >
            {/* 新規タスク作成ボタン */}
            <button
              type="button"
              className={`${styles.item} ${styles.itemTop}`}
              onClick={() => {
                // 親から渡された処理を実行（あれば）
                onCreateTask?.();
                // メニューを閉じる
                close();
              }}
            >
              新規タスク作成
            </button>

            {/* 新規プロジェクト作成ボタン */}
            <button
              type="button"
              className={`${styles.item} ${styles.itemBottom}`}
              onClick={() => {
                onCreateProject?.();
                close();
              }}
            >
              新規プロジェクト作成
            </button>
          </div>
        )}

        {/* 
          Floating Action Button
          クリックするたびに open を反転させて
          メニューの固定表示を ON / OFF する
        */}
        <button
        type="button"
        className={`${styles.fab} ${visible ? styles.fabActive : ""}`}
        aria-label="追加"
        onClick={() => setOpen((v) => !v)}
        >
            ✎
        </button>
      </div>
    </>
  );
}
