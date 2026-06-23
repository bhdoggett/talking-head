import { useState, useEffect, useRef } from "react";
import styles from "./MenuWindow.module.css";
import { SHAPE_LABELS, SHAPE_LIST } from "./shapes";

interface AppConfig {
  backgroundBlur: boolean;
  mirrored: boolean;
  size: number;
  border: { width: number; color: string; shadow: boolean };
  opacity: number;
  shape: string;
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

const MENU_W = 140;

export function MenuWindow() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState<string | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const subRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "visible";
    document.body.style.overflow = "visible";
    document.getElementById("root")!.style.overflow = "visible";
  }, []);

  useEffect(() => {
    window.electronAPI.getConfig().then((c) => setConfig(c as AppConfig));
    const unsubscribe = window.electronAPI.onConfigChanged((c) => {
      setConfig(c as AppConfig);
    });
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.close();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", handleKey);
    };
  }, []);


  if (!config) return null;

  const update = (updates: Record<string, unknown>) => {
    window.electronAPI.updateConfig(updates);
  };

  const setBorder = (updates: Partial<typeof config.border>) => {
    const newBorder = { ...config.border, ...updates };
    if (updates.color && config.border.width === 0) {
      newBorder.width = 2;
    }
    update({ border: newBorder });
  };

  const subContent = () => {
    switch (openSub) {
      case "size":
        return SIZE_PRESETS.map((p) => (
          <button
            key={p.value}
            className={`${styles.option} ${config.size === p.value ? styles.active : ""}`}
            onClick={() => window.electronAPI.setSize(p.value)}
          >
            {p.label} {config.size === p.value ? "✓" : ""}
          </button>
        ));
      case "shape":
        return SHAPE_LIST.map((key) => (
          <button
            key={key}
            className={`${styles.option} ${config.shape === key ? styles.active : ""}`}
            onClick={() => update({ shape: key })}
          >
            {SHAPE_LABELS[key]} {config.shape === key ? "✓" : ""}
          </button>
        ));
      case "opacity":
        return [1.0, 0.8, 0.6, 0.4].map((v) => {
          const match = Math.abs(config.opacity - v) < 0.01;
          return (
            <button
              key={v}
              className={`${styles.option} ${match ? styles.active : ""}`}
              onClick={() => update({ opacity: v })}
            >
              {Math.round(v * 100)}% {match ? "✓" : ""}
            </button>
          );
        });
      case "border":
        return (
          <>
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
              onClick={() => colorInputRef.current?.click()}
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
                }}
              />
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.menu}>
        <button
          className={`${styles.option} ${config.backgroundBlur ? styles.active : ""}`}
          onClick={() => update({ backgroundBlur: !config.backgroundBlur })}
          onMouseEnter={() => setOpenSub(null)}
        >
          Blur {config.backgroundBlur ? "✓" : ""}
        </button>
        <button
          className={`${styles.option} ${config.mirrored ? styles.active : ""}`}
          onClick={() => update({ mirrored: !config.mirrored })}
          onMouseEnter={() => setOpenSub(null)}
        >
          Mirror {config.mirrored ? "✓" : ""}
        </button>
        <button
          className={`${styles.option} ${config.border.shadow ? styles.active : ""}`}
          onClick={() => setBorder({ shadow: !config.border.shadow })}
          onMouseEnter={() => setOpenSub(null)}
        >
          Shadow {config.border.shadow ? "✓" : ""}
        </button>
        <hr className={styles.separator} />
        <button
          className={`${styles.option} ${openSub === "size" ? styles.highlighted : ""}`}
          onMouseEnter={() => setOpenSub("size")}
        >
          Size ›
        </button>
        <button
          className={`${styles.option} ${openSub === "shape" ? styles.highlighted : ""}`}
          onMouseEnter={() => setOpenSub("shape")}
        >
          Shape ›
        </button>
        <button
          className={`${styles.option} ${openSub === "border" ? styles.highlighted : ""}`}
          onMouseEnter={() => setOpenSub("border")}
        >
          Border ›
        </button>
        <button
          className={`${styles.option} ${openSub === "opacity" ? styles.highlighted : ""}`}
          onMouseEnter={() => setOpenSub("opacity")}
        >
          Opacity ›
        </button>
        <hr className={styles.separator} />
        <div className={styles.hint}>⌘⇧H to toggle</div>
        <button className={styles.option} onClick={() => window.close()}>
          Close
        </button>
      </div>
      {openSub && (
        <div className={styles.subMenuWrapper}>
          <div className={styles.subMenu} ref={subRef}>
            {subContent()}
          </div>
        </div>
      )}
    </div>
  );
}
