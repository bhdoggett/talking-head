import { useRef, useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    electronAPI: {
      setPosition: (x: number, y: number) => Promise<void>;
      setSize: (size: number) => Promise<void>;
      setIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
      setHover: (hovered: boolean) => Promise<void>;
      setBorderColor: (color: string) => Promise<void>;
      toggleMenu: () => Promise<void>;
      resizeMenu: (width: number, height: number) => Promise<void>;
      updateConfig: (updates: Record<string, unknown>) => Promise<void>;
      getConfig: () => Promise<{
        position: { x: number; y: number };
        size: number;
        cameraDeviceId: string | null;
        border: { width: number; color: string; shadowAmount: number };
        mirrored: boolean;
        blurAmount: number;
        opacity: number;
        shape: string;
      }>;
      onConfigChanged: (callback: (config: unknown) => void) => () => void;
      onSetCamera: (callback: (deviceId: string) => void) => () => void;
    };
  }
}

export function useCamera(initialDeviceId: string | null) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamReady, setStreamReady] = useState(0);

  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  useEffect(() => {
    if (videoElRef.current && streamRef.current) {
      videoElRef.current.srcObject = streamRef.current;
    }
  }, [streamReady]);

  const startCamera = async (deviceId: string | null) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setStreamReady((n) => n + 1);
      setError(null);
    } catch (err) {
      setError("Camera unavailable");
      console.error("Camera error:", err);
    }
  };

  useEffect(() => {
    startCamera(initialDeviceId);

    const unsubscribe = window.electronAPI.onSetCamera((deviceId) => {
      startCamera(deviceId);
    });

    return () => {
      unsubscribe();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { videoRef, error, streamRef };
}
