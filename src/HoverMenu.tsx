import styles from "./HoverMenu.module.css";

interface HoverMenuProps {
  visible: boolean;
}

export function HoverMenu({ visible }: HoverMenuProps) {
  return (
    <div className={`${styles.trigger} ${visible ? styles.visible : ""}`}>
      <button
        className={styles.ellipsis}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => window.electronAPI.toggleMenu()}
      >
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </button>
    </div>
  );
}
