import { useRef, useEffect, useState, useCallback } from "react";
import { api } from "../api";

// Device labels are only populated after camera permission is granted, so report after getUserMedia
async function reportCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    await api.setCameras(
      devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}` })),
    );
  } catch (err) {
    console.error("Camera list error:", err);
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
      reportCameras();
    } catch (err) {
      setError("Camera unavailable");
      console.error("Camera error:", err);
    }
  };

  useEffect(() => {
    startCamera(initialDeviceId);

    const unsubscribe = api.onSetCamera((deviceId) => {
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
