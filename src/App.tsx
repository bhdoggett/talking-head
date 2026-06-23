import { useCallback, useEffect, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useBlur } from "./hooks/useBlur";
import { useDrag } from "./hooks/useDrag";
import styles from "./App.module.css";

interface AppConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadow: boolean };
  mirrored: boolean;
  backgroundBlur: boolean;
}

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { videoRef, error, streamRef } = useCamera(config?.cameraDeviceId ?? null);
  const { canvasRef } = useBlur(
    streamRef.current,
    config?.backgroundBlur ?? false,
    config?.mirrored ?? true,
  );
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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!config) return;
      const delta = e.deltaY > 0 ? -10 : 10;
      const newSize = Math.max(80, Math.min(200, config.size + delta));
      if (newSize !== config.size) {
        setConfig((prev) => (prev ? { ...prev, size: newSize } : prev));
        window.electronAPI.setSize(newSize);
      }
    },
    [config],
  );

  return (
    <div
      className={styles.bubble}
      style={borderStyle as React.CSSProperties}
      onMouseDown={onMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : config?.backgroundBlur ? (
        <canvas ref={canvasRef} className={styles.canvas} />
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
