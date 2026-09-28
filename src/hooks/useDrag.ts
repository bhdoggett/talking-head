import { useCallback } from "react";
import { api } from "../api";

// Hands the drag to the OS window manager; Rust saves the new position on the Moved event
export function useDrag() {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    api.startDragging();
  }, []);

  return { onMouseDown };
}
