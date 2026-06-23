import { useCallback, useEffect, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useBlur } from "./hooks/useBlur";
import { useDrag } from "./hooks/useDrag";
import { HoverMenu } from "./HoverMenu";
import styles from "./App.module.css";
import { SHAPE_CLIPS, SVG_CLIP_DEFS } from "./shapes";

interface AppConfig {
  position: { x: number; y: number };
  size: number;
  cameraDeviceId: string | null;
  border: { width: number; color: string; shadow: boolean };
  mirrored: boolean;
  backgroundBlur: boolean;
  opacity: number;
  shape: string;
}

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hovered, setHovered] = useState(false);
  const { videoRef, error, streamRef } = useCamera(
    config?.cameraDeviceId ?? null,
  );

  const isOutline = config?.shape === "outline";
  const { canvasRef } = useBlur(
    streamRef.current,
    config?.backgroundBlur || isOutline ? true : false,
    config?.mirrored ?? true,
    isOutline,
  );
  const { onMouseDown } = useDrag();

  useEffect(() => {
    window.electronAPI.getConfig().then(setConfig);
    const unsubscribe = window.electronAPI.onConfigChanged((c) => {
      setConfig(c as AppConfig);
    });
    return unsubscribe;
  }, []);

  const clipPath = config ? SHAPE_CLIPS[config.shape] : undefined;
  const isSimpleShape = !config || ["circle", "rounded-square"].includes(config.shape);

  const bubbleBoxShadow = (() => {
    if (!config || isOutline) return undefined;
    if (!isSimpleShape) return undefined;
    const shadows: string[] = [];
    if (config.border.width > 0) {
      shadows.push(`0 0 0 ${config.border.width}px ${config.border.color}`);
    }
    if (config.border.shadow) {
      shadows.push("-2px 3px 8px rgba(0,0,0,0.3)");
    }
    return shadows.length > 0 ? shadows.join(", ") : undefined;
  })();

  const wrapperFilter = (() => {
    if (!config || isOutline || isSimpleShape) return undefined;
    if (config.border.shadow) {
      return "drop-shadow(-1px 2px 4px rgba(0,0,0,0.3))";
    }
    return undefined;
  })();

  const handleMouseEnter = () => {
    setHovered(true);
    window.electronAPI.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    window.electronAPI.setIgnoreMouseEvents(true);
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!config) return;
      const delta = e.deltaY > 0 ? -10 : 10;
      const newSize = Math.max(80, Math.min(320, config.size + delta));
      if (newSize !== config.size) {
        setConfig((prev) => (prev ? { ...prev, size: newSize } : prev));
        window.electronAPI.setSize(newSize);
      }
    },
    [config],
  );

  if (!config) return null;

  return (
    <div
      className={styles.container}
      onMouseLeave={handleMouseLeave}
      style={{ opacity: config.opacity }}
    >
      <div dangerouslySetInnerHTML={{ __html: SVG_CLIP_DEFS }} />
      <div className={styles.bubbleWrapper} style={{ filter: wrapperFilter }}>
        <div
          className={`${styles.bubble} ${isOutline ? styles.outlineMode : ""}`}
          style={{
            clipPath: isSimpleShape || isOutline ? undefined : clipPath,
            borderRadius: config.shape === "circle" ? "50%"
              : config.shape === "rounded-square" ? "20%"
              : undefined,
            boxShadow: bubbleBoxShadow,
          } as React.CSSProperties}
          onMouseEnter={handleMouseEnter}
          onMouseDown={onMouseDown}
          onWheel={handleWheel}
        >
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : (
          <>
            {!isOutline && (
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
            {(config.backgroundBlur || isOutline) && (
              <canvas ref={canvasRef} className={styles.canvasOverlay} />
            )}
          </>
        )}
        <HoverMenu visible={hovered} />
      </div>
      </div>
    </div>
  );
}
