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
  border: { width: number; color: string; shadowAmount: number };
  mirrored: boolean;
  blurAmount: number;
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
    isOutline ? Math.max(config?.blurAmount ?? 0, 10) : (config?.blurAmount ?? 0),
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
    if (config.border.shadowAmount > 0) {
      const s = config.border.shadowAmount;
      const blur = Math.min(s * 1.0, 10);
      const oy = Math.min(s * 0.4, 4);
      const ox = Math.min(s * 0.25, 2.5);
      const alpha = Math.min(s * 0.09, 0.88);
      shadows.push(`-${ox.toFixed(1)}px ${oy.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,${alpha.toFixed(2)})`);
    }
    return shadows.length > 0 ? shadows.join(", ") : undefined;
  })();

  const wrapperFilter = (() => {
    if (!config || isOutline || isSimpleShape) return undefined;
    if (config.border.shadowAmount > 0) {
      const s = config.border.shadowAmount;
      const blur = Math.min(s * 0.8, 8);
      const oy = Math.min(s * 0.4, 4);
      const ox = Math.min(s * 0.2, 2);
      const alpha = Math.min(s * 0.09, 0.88);
      return `drop-shadow(-${ox.toFixed(1)}px ${oy.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,${alpha.toFixed(2)}))`;
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
            {(config.blurAmount > 0 || isOutline) && (
              <canvas ref={canvasRef} className={styles.canvasOverlay} />
            )}
          </>
        )}
      </div>
      <HoverMenu visible={hovered} />
      </div>
    </div>
  );
}
