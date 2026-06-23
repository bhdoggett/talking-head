import styles from "./HoverMenu.module.css";

interface HoverMenuProps {
  visible: boolean;
  config: {
    backgroundBlur: boolean;
    mirrored: boolean;
    size: number;
  };
  onToggleBlur: () => void;
  onToggleMirror: () => void;
  onSizeChange: (size: number) => void;
}

export function HoverMenu({
  visible,
  config,
  onToggleBlur,
  onToggleMirror,
  onSizeChange,
}: HoverMenuProps) {
  return (
    <div
      className={`${styles.pill} ${visible ? styles.visible : ""}`}
    >
      <button
        className={`${styles.iconButton} ${config.backgroundBlur ? styles.active : ""}`}
        onClick={onToggleBlur}
        title="Background Blur"
      >
        B
      </button>
      <button
        className={`${styles.iconButton} ${config.mirrored ? styles.active : ""}`}
        onClick={onToggleMirror}
        title="Mirror"
      >
        M
      </button>
      <input
        type="range"
        className={styles.slider}
        min={80}
        max={200}
        step={10}
        value={config.size}
        onChange={(e) => onSizeChange(Number(e.target.value))}
        title="Size"
      />
    </div>
  );
}
