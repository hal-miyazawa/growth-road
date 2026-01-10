// src/types/models.ts

/**
 * =========================
 * Growth Road / DB前提モデル（フロント用）
 * =========================
 *
 * ▼ここまでの設計の要点（超まとめ）
 * 1) DBは labels / projects / tasks の3テーブル想定。
 * 2) タスクは project_id / label_id / parent_task_id を NULL 許容。
 * 3) 総合画面（Dashboard）の表示ルールは2種類：
 *    - project_id があるタスク：各プロジェクトで「今の1件だけ」を表示して進めていく
 *    - project_id が NULL のタスク：単体タスク扱いで、未完了は “全部表示” する
 *
 * 4) 「子タスクを持つ親タスク」は “プロジェクト化” できる。
 *    例）学習プロジェクト内に 1,2,3,4 があり、2が子(11,12,13,14)を持つ場合、
 *        parent_task_id を使って階層を表現する（11..の parent_task_id = 2）。
 *
 * 5) 表示順は「平坦化(Flatten)」で決める想定。
 *    ルートの順番は order_index で 1 → 2 → 3 → 4。
 *    ただし “子を持つ親(2)” は表示せず、その位置に子(11..14)を差し込む。
 *    → 表示順：1, 11, 12, 13, 14, 3, 4
 *
 * 6) order_index は「同一(project_id, parent_task_id)内」で 0..n-1 を維持する前提。
 *    タスク追加/削除/順番変更時には、必ず整形(再採番)関数を通して
 *    欠番・重複が絶対起きないようにする。
 *
 * 7) 進捗の持ち方について（現在の方針）
 *    - 現状は Project に current_order_index を持つ(A案)。
 *      ※将来的に階層の進行まで確実に扱うなら current_task_id 方式の方が強い。
 *      ただし現段階では A案で進める。
 */

/**
 * IDは将来DBでは UUID を想定。
 * フロントでは string に統一しておくと、後でAPI導入しても崩れにくい。
 */
export type ID = string;

/**
 * ラベル（任意）
 * - project / task どちらにも紐づけ可能（NULL許容）
 * - color/icon はUI用。未設定でもOK。
 */
export type Label = {
  id: ID;
  name: string;
  color?: string | null;
  created_at: string; // ISO文字列（例: new Date().toISOString()）
};

/**
 * プロジェクト
 * - label_id はプロジェクト全体の色/カテゴリに使う（任意）
 * - current_order_index は「今表示したいタスクの order_index」を表す(A案)
 *
 * 例）ルート階層の表示を進める場合：
 *   current_order_index = 0 → order_index=0 のタスクを表示
 *   current_order_index = 1 → order_index=1 のタスクを表示
 *
 * ※注意：
 *   2のような「子を持つタスク」をどう進めるか（子へ潜る/スキップして次へなど）は
 *   今後ロジックで決める。将来は current_task_id 方式に寄せる可能性あり。
 */
export type Project = {
  id: ID;
  name: string;
  label_id?: ID | null;

  /**
   * このプロジェクトで「現在表示する段階」
   * - completed したら +1 する想定（まずはシンプルに）
   * - tasks 側の order_index は 0..n-1 を維持する前提（欠番/重複を作らない）
   */
  current_order_index: number;

  created_at: string;
  updated_at: string;
};

/**
 * タスク
 *
 * ✅ 重要仕様（このモデルを読んだだけで迷わないための説明）
 *
 * 1) project_id が NULL のタスクは「単体タスク」扱い。
 *    → 総合画面では、未完了なら “全部表示” する（プロジェクト進行の対象外）。
 *
 * 2) parent_task_id は「サブプロジェクト」を表すための親参照。
 *    例）学習プロジェクト内に 1,2,3,4 があり、2が子(11,12,13,14)を持つ：
 *        - 11/12/13/14 の parent_task_id = 2
 *        - これで「2の中に11..がある」を表現できる
 *
 * 3) order_index は “同一(project_id, parent_task_id)内” の並び順。
 *    - ルート階層：parent_task_id=null の中で 0..n-1
 *    - 子階層：parent_task_id=2 の中で 0..n-1（11..14の並び）
 *
 * 4) 表示順（平坦化）の基本方針：
 *    - ルートの順番は order_index 順
 *    - 子を持つ親タスクは「親を表示せず、子をその位置に差し込む」
 *      例）1,2,3,4 で 2 が子を持つ → 1,11,12,13,14,3,4
 *
 * 5) 欠番・重複対策：
 *    タスク追加/削除/順番変更後は、必ず再採番（normalize）して
 *    同一グループ内の order_index を 0..n-1 に整える。
 */
export type Task = {
  id: ID;

  project_id?: ID | null;
  label_id?: ID | null;
  parent_task_id?: ID | null;

  // ★追加：親（グループ）用タスク。カードには出さない
  is_group?: boolean;

  order_index: number;
  title: string;
  memo?: string | null;

  completed: boolean;
  completed_at?: string | null;

  is_fixed: boolean;

  created_at: string;
  updated_at: string;
};