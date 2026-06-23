import { useState, useEffect } from "react";
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
}

const SIZE_PRESETS = [
  { label: "Small", value: 200 },
  { label: "Medium", value: 260 },
  { label: "Large", value: 320 },
] as const;

const BORDER_STYLES = [
  { label: "None", value: 0 },
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
}: HoverMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      setSubmenu(null);
    }
  }, [visible]);

  const back = () => setSubmenu(null);

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
      <div className={styles.separator} />
      <button className={styles.option} onClick={() => setSubmenu("size")}>
        Size ›
      </button>
      <button className={styles.option} onClick={() => setSubmenu("border")}>
        Border ›
      </button>
      <div className={styles.separator} />
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
      <div className={styles.separator} />
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
      <div className={styles.separator} />
      {BORDER_STYLES.map((s) => (
        <button
          key={s.value}
          className={`${styles.option} ${config.border.width === s.value ? styles.active : ""}`}
          onClick={() => onUpdateConfig({ border: { ...config.border, width: s.value } })}
        >
          {s.label} {config.border.width === s.value ? "✓" : ""}
        </button>
      ))}
      <div className={styles.separator} />
      {BORDER_COLORS.map((c) => (
        <button
          key={c.value}
          className={`${styles.option} ${config.border.color === c.value ? styles.active : ""}`}
          onClick={() => onUpdateConfig({ border: { ...config.border, color: c.value } })}
        >
          <span>{c.label}</span>
          <span className={styles.swatch} style={{ background: c.value }} />
        </button>
      ))}
      <div className={styles.separator} />
      <button
        className={`${styles.option} ${config.border.shadow ? styles.active : ""}`}
        onClick={() => onUpdateConfig({ border: { ...config.border, shadow: !config.border.shadow } })}
      >
        Shadow {config.border.shadow ? "✓" : ""}
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
