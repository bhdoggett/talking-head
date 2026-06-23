import { useRef, useEffect, useCallback } from "react";

export function useDrag() {
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.screenX, y: e.screenY };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.screenX - dragOffset.current.x;
      const deltaY = e.screenY - dragOffset.current.y;
      dragOffset.current = { x: e.screenX, y: e.screenY };
      window.electronAPI.setPosition(deltaX, deltaY);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { onMouseDown };
}
