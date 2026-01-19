import { useEffect, useRef, useState } from "react";
import styles from "./Sidebar.module.scss";
import type { ID, Label } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;

  labels: Label[];
  selectedLabelId: ID | null; // null = 全部表示
  onSelectLabel: (id: ID | null) => void;

  onOpenHistory?: () => void;

  // ★変更：色も持てるように（親で labels 更新）
  onAddLabel: (name: string, color: string | null) => void;

  // ★追加：既存ラベルの色更新（親でlabels更新）
  onUpdateLabelColor?: (id: ID, color: string) => void;

  onDeleteLabel?: (id: ID) => void;
};

const PALETTE: string[] = [
  "#212121",
  "#2962FF",
  "#3D00A4",
  "#1F7A83",
  "#2E7D32",
  "#6B7B00",
  "#C85A0A",
  "#6D6D6D",
  "#0D47A1",
  "#9C27B0",
  "#3AA6B6",
  "#43A047",
  "#7CB342",
  "#A00022",
  "#B0B0B0",
  "#5E97D6",
  "#D35CB8",
  "#5BC1CE",
  "#67D08A",
  "#A6C93A",
  "#D6455D",
];

type PickerState =
  | { open: false }
  | {
      open: true;
      target: "label";
      labelId: ID;          // ← labelの時は必須にする
      top: number;
      left: number;
      current?: string | null;
    }
  | {
      open: true;
      target: "new";
      top: number;
      left: number;
      current?: string | null;
    };

export default function Sidebar({
  open,
  onClose,
  labels,
  selectedLabelId,
  onSelectLabel,
  onOpenHistory,
  onAddLabel,
  onUpdateLabelColor,
  onDeleteLabel,
}: Props) {
  // 追加モード（ラベル追加行が input に変形）
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string | null>("#0D47A1");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<ID | null>(null);
  const moreWrapRef = useRef<HTMLDivElement | null>(null);
  const [forceExpanded, setForceExpanded] = useState(false);



  // ★追加：カラーピッカー
  const [picker, setPicker] = useState<PickerState>({ open: false });

  // ★追加：入力中は強制的にexpanded扱い
  const expanded = open || adding || forceExpanded;


  // 追加モードになったらフォーカス
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  // ★ポップアップ外クリックで閉じる
  useEffect(() => {
    if (!picker.open) return;

    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest(`.${styles.colorPopover}`)) return; // ポップアップ内ならOK
      setPicker({ open: false });
    };

    window.addEventListener("pointerdown", onDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onDown, { capture: true } as any);
  }, [picker.open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!moreOpenId) return;
      const el = e.target as Node;
      if (moreWrapRef.current && moreWrapRef.current.contains(el)) return;
      setMoreOpenId(null);
    };

    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [moreOpenId]);

  const commit = () => {
    const name = draft.trim();
    if (!name) return; // 空なら閉じない（おすすめ）

    onAddLabel(name, draftColor);

    setAdding(false);
    setDraft("");
    // setForceExpanded(true); // すでにtrueのはずなので不要
  };

  const cancel = () => {
    setAdding(false);
    setDraft("");
  };


  const openPickerFor = (
    e: React.MouseEvent,
    args:
      | { target: "label"; labelId: ID; current?: string | null }
      | { target: "new"; current?: string | null }
  ) => {
    e.stopPropagation();

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const top = rect.top + rect.height + 8;
  const left = rect.left;


  if (args.target === "label") {
    setPicker({
      open: true,
      target: "label",
      labelId: args.labelId,     // ← ここが安全に参照できる
      top,
      left,
      current: args.current ?? null,
    });
  } else {
    setPicker({
      open: true,
      target: "new",
      top,
      left,
      current: args.current ?? null,
    });
  }
};

  const chooseColor = (color: string) => {
    if (!picker.open) return;

    if (picker.target === "new") {
      setDraftColor(color);
    } else {
      onUpdateLabelColor?.(picker.labelId, color);
    }
    setPicker({ open: false });
  };

  const closeAddMode = () => {
    setAdding(false);
    setDraft("");
    setPicker({ open: false });
    setForceExpanded(false); // ★強制展開も解除
  };

  return (
    <>
      {expanded && (
        <div
          className={styles.backdrop}
          onClick={() => {
            closeAddMode();     // ★作成中やめる（adding/picker/forceExpanded解除）
            setMoreOpenId(null); // ★⋮開いてたら閉じる（任意だけど自然）
            setPicker({ open: false }); // closeAddModeに入ってるなら不要
            onClose();          // ★サイドバー閉じる
          }}
        />
      )}

      {/* ★カラーポップアップ */}
      {picker.open && (
        <div
          className={styles.colorPopover}
          style={{ top: picker.top, left: picker.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.colorGrid}>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorDot} ${
                  (picker.current ?? "").toLowerCase() === c.toLowerCase()
                    ? styles.colorDotActive
                    : ""
                }`}
                style={{ backgroundColor: c }}
                onClick={() => chooseColor(c)}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
        </div>
      )}

      <aside
        className={`${styles.sidebar} ${
          expanded ? styles.expanded : styles.collapsed
        }`}
      >
        <nav className={styles.nav}>
          {/* 総合（固定） */}
          <button
            type="button"
            className={`${styles.item} ${
              selectedLabelId === null ? styles.active : ""
            }`}
            onClick={() => {
              onSelectLabel(null);
              onClose();
            }}
          >
            <span className={`${styles.icon} ${styles.iconSummary}`}>▦</span>
            <span className={styles.label}>総合</span>
          </button>

          {/* ラベル一覧 */}
          {labels.map((l) => (
            <div className={styles.rowWrap} key={l.id} ref={moreOpenId === l.id ? moreWrapRef : undefined}>
              <button
                type="button"
                className={`${styles.item} ${selectedLabelId === l.id ? styles.active : ""}`}
                onClick={() => {
                  closeAddMode();   
                  onSelectLabel(l.id);
                  onClose();
                }}
              >
                <span
                  className={styles.colorChip}
                  style={{ backgroundColor: l.color ?? "#BDBDBD" }}
                  aria-hidden="true"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => openPickerFor(e, { target: "label", labelId: l.id, current: l.color ?? null })}
                />
                <span className={styles.label}>{l.name}</span>

                {/* ⋮ボタン */}
                <button
                  type="button"
                  className={`${styles.moreBtn} ${selectedLabelId === l.id ? styles.moreBtnActive : ""}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpenId((prev) => (prev === l.id ? null : l.id));
                  }}
                  aria-label="label menu"
                >
                  ⋮
                </button>
              </button>

              {/* メニュー：ProjectModalのlabelMenu UIを流用 */}
              {moreOpenId === l.id && (
                <div className={styles.labelMenu} onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.labelItem}
                    onClick={() => {
                      // TODO: 編集（名前変更モードにする等）
                      console.log("edit", l.id);
                      setMoreOpenId(null);
                    }}
                  >
                    編集
                  </button>

                  <button
                    type="button"
                    className={`${styles.labelItem} ${styles.danger}`}
                    onClick={() => {
                      onDeleteLabel?.(l.id);
                      setMoreOpenId(null);
                    }}
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* ラベル追加 */}
          {!adding ? (
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setAdding(true);
                setForceExpanded(true); // ★追加中は展開を維持
              }}
            >
              <span className={styles.icon}>＋</span>
              <span className={styles.label}>ラベル追加</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.item}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.icon}>
                <span
                  className={styles.colorChip}
                  style={{ backgroundColor: draftColor ?? "#BDBDBD" }}
                  aria-hidden="true"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => openPickerFor(e, { target: "new", current: draftColor })}
                />
              </span>
              <input
                ref={inputRef}
                className={styles.inlineInput}
                value={draft}
                placeholder="新しいラベル名"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") cancel();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          )}

          {/* 履歴（固定） */}
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onOpenHistory?.();
              onClose();
            }}
          >
            <span className={styles.icon}>↩︎</span>
            <span className={styles.label}>履歴</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
