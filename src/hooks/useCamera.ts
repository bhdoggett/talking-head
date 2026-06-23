import { useRef, useEffect, useState } from "react";

declare global {
  interface Window {
    electronAPI: {
      setPosition: (x: number, y: number) => Promise<void>;
      setSize: (size: number) => Promise<void>;
      setIgnoreMouseEvents: (ignore: boolean) => Promise<void>;
      setHover: (hovered: boolean) => Promise<void>;
      setBackgroundBlur: (enabled: boolean) => Promise<void>;
      setBorderColor: (color: string) => Promise<void>;
      updateConfig: (updates: Record<string, unknown>) => Promise<void>;
      getConfig: () => Promise<{
        position: { x: number; y: number };
        size: number;
        cameraDeviceId: string | null;
        border: { width: number; color: string; shadow: boolean };
        mirrored: boolean;
        backgroundBlur: boolean;
      }>;
      onConfigChanged: (callback: (config: unknown) => void) => () => void;
      onSetCamera: (callback: (deviceId: string) => void) => () => void;
    };
  }
}

export function useCamera(initialDeviceId: string | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
