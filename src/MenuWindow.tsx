import { useState, useEffect, useRef } from "react";
import styles from "./MenuWindow.module.css";
import { SHAPE_LABELS, SHAPE_LIST, SIMPLE_SHAPES } from "./shapes";

interface AppConfig {
  blurAmount: number;
  mirrored: boolean;
  size: number;
  border: { width: number; color: string; shadowAmount: number };
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "visible";
    document.body.style.overflow = "visible";
    document.getElementById("root")!.style.overflow = "visible";
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      window.electronAPI.resizeMenu(400, el.offsetHeight);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    window.electronAPI.getConfig().then((c) => setConfig(c as AppConfig));
    const unsubscribe = window.electronAPI.onConfigChanged((c) => {
      setConfig(c as AppConfig);
    });
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.close();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        window.close();
      }
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleMouseDown);
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

  const hasSub = openSub && ["size", "shape", "border"].includes(openSub);

  return (
    <>
      <div className={styles.overlay} onMouseDown={() => window.close()} />
      <div className={styles.wrapper} ref={wrapperRef}>
        <div className={styles.menu}>
          <button
            className={`${styles.option} ${config.mirrored ? styles.active : ""}`}
            onClick={() => update({ mirrored: !config.mirrored })}
            onMouseEnter={() => setOpenSub(null)}
          >
            Mirror {config.mirrored ? "✓" : ""}
          </button>
          <div
            className={`${styles.sliderOption} ${config.blurAmount > 0 ? styles.active : ""}`}
            onMouseEnter={() => setOpenSub(null)}
          >
            <span className={styles.optionLabel}>Blur {config.blurAmount > 0 && <span className={styles.check}>✓</span>}</span>
            <div className={styles.sliderReveal}>
              <input
                type="range" min={0} max={20} step={1}
                value={config.blurAmount}
                className={styles.slider}
                style={{ "--fill": `${(config.blurAmount / 20) * 100}%` } as React.CSSProperties}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => update({ blurAmount: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{config.blurAmount > 0 ? `${config.blurAmount}px` : "Off"}</span>
            </div>
          </div>
          <div
            className={`${styles.sliderOption} ${config.border.shadowAmount > 0 ? styles.active : ""}`}
            onMouseEnter={() => setOpenSub(null)}
          >
            <span className={styles.optionLabel}>Shadow {config.border.shadowAmount > 0 && <span className={styles.check}>✓</span>}</span>
            <div className={styles.sliderReveal}>
              <input
                type="range" min={0} max={10} step={1}
                value={config.border.shadowAmount}
                className={styles.slider}
                style={{ "--fill": `${(config.border.shadowAmount / 10) * 100}%` } as React.CSSProperties}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setBorder({ shadowAmount: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{config.border.shadowAmount > 0 ? config.border.shadowAmount : "Off"}</span>
            </div>
          </div>
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
          {SIMPLE_SHAPES.has(config.shape) ? (
            <button
              className={`${styles.option} ${openSub === "border" ? styles.highlighted : ""}`}
              onMouseEnter={() => setOpenSub("border")}
            >
              Border ›
            </button>
          ) : (
            <button
              className={`${styles.option} ${styles.disabled}`}
              onMouseEnter={() => setOpenSub(null)}
              title="No borders on special shapes"
            >
              Border
            </button>
          )}
          <div
            className={`${styles.sliderOption} ${config.opacity < 1 ? styles.active : ""}`}
            onMouseEnter={() => setOpenSub(null)}
          >
            <span className={styles.optionLabel}>Opacity {config.opacity < 1 && <span className={styles.check}>✓</span>}</span>
            <div className={styles.sliderReveal}>
              <input
                type="range" min={10} max={100} step={1}
                value={Math.round(config.opacity * 100)}
                className={styles.slider}
                style={{ "--fill": `${Math.round(config.opacity * 100)}%` } as React.CSSProperties}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => update({ opacity: Number(e.target.value) / 100 })}
              />
              <span className={styles.sliderValue}>{Math.round(config.opacity * 100)}%</span>
            </div>
          </div>
          <hr className={styles.separator} />
          <div className={styles.hint}>⌘⇧H to toggle</div>
          <button className={styles.option} onClick={() => window.close()}>
            Close
          </button>
        </div>
        {hasSub && (
          <div className={styles.subMenuWrapper}>
            <div className={styles.subMenu} ref={subRef}>
              {subContent()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
