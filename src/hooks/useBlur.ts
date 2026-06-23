import { useRef, useEffect } from "react";
import { SelfieSegmentation, Results } from "@mediapipe/selfie_segmentation";

export function useBlur(
  stream: MediaStream | null,
  enabled: boolean,
  mirrored: boolean,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmenterRef = useRef<SelfieSegmentation | null>(null);
  const animFrameRef = useRef<number>(0);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!enabled || !stream) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      if (segmenterRef.current) {
        segmenterRef.current.close();
        segmenterRef.current = null;
      }
      if (videoElRef.current) {
        videoElRef.current.pause();
        videoElRef.current.srcObject = null;
        videoElRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play();
    videoElRef.current = video;

    const segmenter = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmenter.setOptions({ modelSelection: 1, selfieMode: false });
    segmenterRef.current = segmenter;

    const onResults = (results: Results) => {
      const w = results.image.width;
      const h = results.image.height;
      canvas.width = w;
      canvas.height = h;

      ctx.save();
      if (mirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      // Draw blurred background
      ctx.filter = "blur(10px)";
      ctx.drawImage(results.image, 0, 0, w, h);
      ctx.filter = "none";

      // Clip to person mask and draw sharp foreground
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(results.segmentationMask, 0, 0, w, h);
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(results.image, 0, 0, w, h);

      ctx.restore();
    };

    segmenter.onResults(onResults);

    let running = true;
    const processFrame = async () => {
      if (!running || video.readyState < 2) {
        if (running) {
          animFrameRef.current = requestAnimationFrame(processFrame);
        }
        return;
      }
      await segmenter.send({ image: video });
      if (running) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    video.addEventListener("loadeddata", () => {
      processFrame();
    });

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      segmenter.close();
      segmenterRef.current = null;
      video.pause();
      video.srcObject = null;
      videoElRef.current = null;
    };
  }, [enabled, stream, mirrored]);

  return { canvasRef };
}
