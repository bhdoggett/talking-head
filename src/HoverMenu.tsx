import { useState, useEffect, useRef } from "react";
import styles from "./HoverMenu.module.css";

interface HoverMenuProps {
  visible: boolean;
  config: {
    backgroundBlur: boolean;
    mirrored: boolean;
    size: number;
    border: { width: number; color: string; shadow: boolean };
  };
  onToggleBlur: () => void;
  onToggleMirror: () => void;
  onSizeChange: (size: number) => void;
  onUpdateConfig: (updates: Record<string, unknown>) => void;
  onHoverLock: (locked: boolean) => void;
}

const SIZE_PRESETS = [
  { label: "Small", value: 200 },
  { label: "Medium", value: 260 },
  { label: "Large", value: 320 },
] as const;

const BORDER_WIDTHS = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 4 },
  { label: "Thick", value: 6 },
] as const;

const BORDER_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Gray", value: "#888888" },
] as const;

export function HoverMenu({
  visible,
  config,
  onToggleBlur,
  onToggleMirror,
  onSizeChange,
  onUpdateConfig,
  onHoverLock,
}: HoverMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [customColor, setCustomColor] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      setSubmenu(null);
    }
  }, [visible]);

  const back = () => setSubmenu(null);

  const setBorder = (updates: Partial<typeof config.border>) => {
    const newBorder = { ...config.border, ...updates };
    if (updates.color && config.border.width === 0) {
      newBorder.width = 2;
    }
    onUpdateConfig({ border: newBorder });
  };

  const mainMenu = (
    <>
      <button
        className={`${styles.option} ${config.backgroundBlur ? styles.active : ""}`}
        onClick={onToggleBlur}
      >
        Blur {config.backgroundBlur ? "✓" : ""}
      </button>
      <button
        className={`${styles.option} ${config.mirrored ? styles.active : ""}`}
        onClick={onToggleMirror}
      >
        Mirror {config.mirrored ? "✓" : ""}
      </button>
      <button
        className={`${styles.option} ${config.border.shadow ? styles.active : ""}`}
        onClick={() => setBorder({ shadow: !config.border.shadow })}
      >
        Shadow {config.border.shadow ? "✓" : ""}
      </button>
      <hr className={styles.separator} />
      <button className={styles.option} onClick={() => setSubmenu("size")}>
        Size ›
      </button>
      <button className={styles.option} onClick={() => setSubmenu("border")}>
        Border ›
      </button>
      <hr className={styles.separator} />
      <button
        className={styles.option}
        onClick={() => window.close()}
      >
        Quit
      </button>
    </>
  );

  const sizeMenu = (
    <>
      <button className={styles.option} onClick={back}>‹ Back</button>
      <hr className={styles.separator} />
      {SIZE_PRESETS.map((p) => (
        <button
          key={p.value}
          className={`${styles.option} ${config.size === p.value ? styles.active : ""}`}
          onClick={() => { onSizeChange(p.value); setOpen(false); }}
        >
          {p.label} {config.size === p.value ? "✓" : ""}
        </button>
      ))}
    </>
  );

  const borderMenu = (
    <>
      <button className={styles.option} onClick={back}>‹ Back</button>
      <hr className={styles.separator} />
      <button
        className={`${styles.option} ${config.border.width === 0 ? styles.active : ""}`}
        onClick={() => setBorder({ width: 0 })}
      >
        None {config.border.width === 0 ? "✓" : ""}
      </button>
      {BORDER_WIDTHS.map((s) => (
        <button
          key={s.value}
          className={`${styles.option} ${config.border.width === s.value ? styles.active : ""}`}
          onClick={() => setBorder({ width: s.value })}
        >
          {s.label} {config.border.width === s.value ? "✓" : ""}
        </button>
      ))}
      <hr className={styles.separator} />
      {BORDER_COLORS.map((c) => (
        <button
          key={c.value}
          className={`${styles.option} ${config.border.color === c.value ? styles.active : ""}`}
          onClick={() => setBorder({ color: c.value })}
        >
          <span>{c.label}</span>
          <span className={styles.swatch} style={{ background: c.value }} />
        </button>
      ))}
      {customColor && !BORDER_COLORS.some((c) => c.value === customColor) && (
        <button
          className={`${styles.option} ${config.border.color === customColor ? styles.active : ""}`}
          onClick={() => setBorder({ color: customColor })}
        >
          <span>Custom</span>
          <span className={styles.swatch} style={{ background: customColor }} />
        </button>
      )}
      <button
        className={styles.option}
        onClick={() => {
          onHoverLock(true);
          colorInputRef.current?.click();
        }}
      >
        <span>Pick Color…</span>
        <input
          ref={colorInputRef}
          type="color"
          className={styles.hiddenInput}
          value={customColor ?? config.border.color}
          onChange={(e) => {
            setCustomColor(e.target.value);
            setBorder({ color: e.target.value });
            onHoverLock(false);
          }}
        />
      </button>
    </>
  );

  return (
    <div className={`${styles.trigger} ${visible ? styles.visible : ""}`}>
      <button
        className={styles.ellipsis}
        onClick={() => { setOpen((o) => !o); setSubmenu(null); }}
      >
        ···
      </button>
      {open && (
        <div className={styles.dropdown}>
          {submenu === null && mainMenu}
          {submenu === "size" && sizeMenu}
          {submenu === "border" && borderMenu}
        </div>
      )}
    </div>
  );
}
