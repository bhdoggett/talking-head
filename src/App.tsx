import { useCallback, useEffect, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useBlur } from "./hooks/useBlur";
import { useDrag } from "./hooks/useDrag";
import { HoverMenu } from "./HoverMenu";
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
  const [hovered, setHovered] = useState(false);
  const { videoRef, error, streamRef } = useCamera(
    config?.cameraDeviceId ?? null,
  );
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
    setHovered(true);
    window.electronAPI.setIgnoreMouseEvents(false);
    window.electronAPI.setHover(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    window.electronAPI.setIgnoreMouseEvents(true);
    window.electronAPI.setHover(false);
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

  const handleToggleBlur = useCallback(() => {
    if (!config) return;
    window.electronAPI.updateConfig({ backgroundBlur: !config.backgroundBlur });
  }, [config]);

  const handleToggleMirror = useCallback(() => {
    if (!config) return;
    window.electronAPI.updateConfig({ mirrored: !config.mirrored });
  }, [config]);

  const handleSizeChange = useCallback((size: number) => {
    setConfig((prev) => (prev ? { ...prev, size } : prev));
    window.electronAPI.setSize(size);
  }, []);

  if (!config) return null;

  return (
    <div
      className={styles.container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={styles.bubble}
        style={borderStyle as React.CSSProperties}
        onMouseDown={onMouseDown}
        onWheel={handleWheel}
      >
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : config.backgroundBlur ? (
          <canvas ref={canvasRef} className={styles.canvas} />
        ) : (
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            playsInline
            muted
            style={{
              transform: config.mirrored ? "scaleX(-1)" : "none",
            }}
          />
        )}
      </div>
      <HoverMenu
        visible={hovered}
        config={config}
        onToggleBlur={handleToggleBlur}
        onToggleMirror={handleToggleMirror}
        onSizeChange={handleSizeChange}
      />
    </div>
  );
}
