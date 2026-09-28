import { useCallback, useEffect, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useBlur } from "./hooks/useBlur";
import { useDrag } from "./hooks/useDrag";
import { HoverMenu } from "./HoverMenu";
import styles from "./App.module.css";
import { api, type AppConfig } from "./api";
import { SHAPE_CLIPS, SVG_CLIP_DEFS, MIN_ZOOM, MAX_ZOOM } from "./shapes";

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hovered, setHovered] = useState(false);
  const { videoRef, error, streamRef } = useCamera(
    config?.cameraDeviceId ?? null,
  );

  const isOutline = config?.shape === "outline";
  const { canvasRef, bgCanvasRef } = useBlur(
    streamRef.current,
    isOutline ? Math.max(config?.blurAmount ?? 0, 10) : (config?.blurAmount ?? 0),
    config?.mirrored ?? true,
    isOutline,
    config?.zoom ?? 1,
  );
  const { onMouseDown } = useDrag();

  useEffect(() => {
    api.getConfig().then(setConfig);
    return api.onConfigChanged(setConfig);
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
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!config) return;
      // Pinch (trackpad) or ⌥+scroll adjusts zoom instead of bubble size
      if (e.ctrlKey || e.altKey) {
        const step = e.ctrlKey ? -e.deltaY * 0.01 : (e.deltaY > 0 ? -0.1 : 0.1);
        const newZoom = Math.round(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, config.zoom + step)) * 100) / 100;
        if (newZoom !== config.zoom) {
          setConfig((prev) => (prev ? { ...prev, zoom: newZoom } : prev));
          api.updateConfig({ zoom: newZoom });
        }
        return;
      }
      const delta = e.deltaY > 0 ? -10 : 10;
      const newSize = Math.max(80, Math.min(320, config.size + delta));
      if (newSize !== config.size) {
        setConfig((prev) => (prev ? { ...prev, size: newSize } : prev));
        api.setSize(newSize);
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
                  transform: `scale(${config.mirrored ? -config.zoom : config.zoom}, ${config.zoom})`,
                }}
              />
            )}
            {config.blurAmount > 0 && !isOutline && (
              <canvas ref={bgCanvasRef} className={styles.canvasOverlay} />
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
