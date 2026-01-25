import { createContext, useContext, useEffect, useRef, useState } from "react";
import type React from "react";
import styles from "./Sidebar.module.scss";
import type { ID, Label } from "../../types/models";

type Props = {
  open: boolean;
  onClose: () => void;

  labels: Label[];
  selectedLabelId: ID | null; // null = 蜈ｨ驛ｨ陦ｨ遉ｺ
  onSelectLabel: (id: ID | null) => void;

  onOpenHistory?: () => void;

  onAddLabel: (title: string, color: string | null) => void;
  onUpdateLabelColor?: (id: ID, color: string) => void;
  onDeleteLabel?: (id: ID) => void;
  onRenameLabel?: (id: ID, title: string) => Promise<void> | void;
};

type LabelRenameContextValue = {
  onRenameLabel?: (id: ID, title: string) => Promise<void> | void;
};

export const LabelRenameContext =
  createContext<LabelRenameContextValue | null>(null);

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
      labelId: ID;
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
  onRenameLabel,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<string | null>("#0D47A1");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const [moreOpenId, setMoreOpenId] = useState<ID | null>(null);
  const moreWrapRef = useRef<HTMLDivElement | null>(null);

  const [forceExpanded, setForceExpanded] = useState(false);
  const [picker, setPicker] = useState<PickerState>({ open: false });
  const [editingLabelId, setEditingLabelId] = useState<ID | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const renameContext = useContext(LabelRenameContext);
  const renameLabel = onRenameLabel ?? renameContext?.onRenameLabel;

  const expanded = open || adding || forceExpanded;

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (!editingLabelId) return;
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingLabelId]);

  useEffect(() => {
    if (!editingLabelId) return;
    if (labels.some((l) => l.id === editingLabelId)) return;
    setEditingLabelId(null);
    setEditDraft("");
  }, [editingLabelId, labels]);

  useEffect(() => {
    if (!picker.open) return;

    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest(`.${styles.colorPopover}`)) return;
      setPicker({ open: false });
    };

    window.addEventListener("pointerdown", onDown, { capture: true });
    return () =>
      window.removeEventListener(
        "pointerdown",
        onDown,
        { capture: true } as any
      );
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
    const title = draft.trim();
    if (!title) return;

    onAddLabel(title, draftColor);

    setAdding(false);
    setDraft("");
  };

  const cancel = () => {
    setAdding(false);
    setDraft("");
  };

  const startEdit = (label: Label) => {
    setEditingLabelId(label.id);
    setEditDraft(label.title);
    setMoreOpenId(null);
  };

  const cancelEdit = () => {
    setEditingLabelId(null);
    setEditDraft("");
  };

  const commitEdit = async (labelId: ID) => {
    const nextTitle = editDraft.trim();
    if (!nextTitle) return;

    const current = labels.find((l) => l.id === labelId);
    if (current && current.title === nextTitle) {
      cancelEdit();
      return;
    }

    if (!renameLabel) {
      cancelEdit();
      return;
    }

    try {
      await renameLabel(labelId, nextTitle);
      cancelEdit();
    } catch {
      alert("Label rename failed.");
    }
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
        labelId: args.labelId,
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
    setForceExpanded(false);
  };

  return (
    <>
      {expanded && (
        <div
          className={styles.backdrop}
          onClick={() => {
            closeAddMode();
            setMoreOpenId(null);
            onClose();
          }}
        />
      )}

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
            <span className={styles.icon}>📋</span>
            <span className={styles.label}>総合</span>
          </button>

          {labels.map((l) => (
            <div
              className={styles.rowWrap}
              key={l.id}
              ref={moreOpenId === l.id ? moreWrapRef : undefined}
            >
              <button
                type="button"
                className={`${styles.item} ${
                  selectedLabelId === l.id ? styles.active : ""
                }`}
                onClick={() => {
                  if (editingLabelId === l.id) return;
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
                  onClick={(e) =>
                    openPickerFor(e, {
                      target: "label",
                      labelId: l.id,
                      current: l.color ?? null,
                    })
                  }
                />
                {editingLabelId === l.id ? (
                  <input
                    ref={editInputRef}
                    className={styles.inlineInput}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        void commitEdit(l.id);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelEdit();
                      }
                    }}
                    onBlur={cancelEdit}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="label title"
                  />
                ) : (
                  <span className={styles.label}>{l.title}</span>
                )}

                <button
                  type="button"
                  className={`${styles.moreBtn} ${
                    selectedLabelId === l.id ? styles.moreBtnActive : ""
                  }`}
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

              {moreOpenId === l.id && (
                <div
                  className={styles.labelMenu}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.labelItem}
                    onClick={() => {
                      startEdit(l);
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

          {!adding ? (
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setAdding(true);
                setForceExpanded(true);
              }}
            >
              <span className={styles.icon}>＋</span>
              <span className={styles.label}>新しいラベル</span>
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
                  onClick={(e) =>
                    openPickerFor(e, { target: "new", current: draftColor })
                  }
                />
              </span>

              <input
                ref={inputRef}
                className={styles.inlineInput}
                value={draft}
                placeholder="ラベル名"
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

          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onOpenHistory?.();
              onClose();
            }}
          >
            <span className={styles.icon}>🕘</span>
            <span className={styles.label}>履歴</span>
          </button>
        </nav>
      </aside>
    </>
  );
}

