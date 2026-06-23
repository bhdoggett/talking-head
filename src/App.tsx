import { useEffect, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useDrag } from "./hooks/useDrag";
import styles from "./App.module.css";

interface AppConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadow: boolean };
  mirrored: boolean;
}

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { videoRef, error } = useCamera(config?.cameraDeviceId ?? null);
  const { onMouseDown } = useDrag();

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig);
    const unsubscribe = window.electronAPI.onConfigChanged((c) => {
      setConfig(c as AppConfig);
    });
    return unsubscribe;
  }, []);

  const borderStyle = config
    ? {
        "--border-width": `${config.border.width}px`,
        "--border-color": config.border.color,
        "--shadow-enabled": config.border.shadow ? "1" : "0",
      }
    : {};

  const handleMouseEnter = () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    window.electronAPI.setIgnoreMouseEvents(true);
  };

  return (
    <div
      className={styles.bubble}
      style={borderStyle as React.CSSProperties}
      onMouseDown={onMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : (
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
          style={{
            transform: config?.mirrored ? "scaleX(-1)" : "none",
          }}
        />
      )}
    </div>
  );
}
