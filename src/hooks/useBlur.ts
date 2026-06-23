import { useRef, useEffect } from "react";
import { SelfieSegmentation, Results } from "@mediapipe/selfie_segmentation";

export function useBlur(
  stream: MediaStream | null,
  enabled: boolean,
  mirrored: boolean,
  outlineOnly: boolean = false,
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

    const bgCanvas = document.createElement("canvas");
    const bgCtx = bgCanvas.getContext("2d")!;
    const fgCanvas = document.createElement("canvas");
    const fgCtx = fgCanvas.getContext("2d")!;

    const onResults = (results: Results) => {
      const srcW = results.image.width;
      const srcH = results.image.height;
      const cropSize = Math.min(srcW, srcH);
      const sx = (srcW - cropSize) / 2;
      const sy = (srcH - cropSize) / 2;

      canvas.width = cropSize;
      canvas.height = cropSize;
      bgCanvas.width = cropSize;
      bgCanvas.height = cropSize;
      fgCanvas.width = cropSize;
      fgCanvas.height = cropSize;

      // Background: image with person cut out, then blur won't spread person colors
      bgCtx.clearRect(0, 0, cropSize, cropSize);
      bgCtx.drawImage(results.image, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
      bgCtx.globalCompositeOperation = "destination-out";
      bgCtx.drawImage(results.segmentationMask, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

      // Foreground: sharp person only
      fgCtx.clearRect(0, 0, cropSize, cropSize);
      fgCtx.drawImage(results.segmentationMask, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
      fgCtx.globalCompositeOperation = "source-in";
      fgCtx.drawImage(results.image, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);

      ctx.save();
      if (mirrored) {
        ctx.translate(cropSize, 0);
        ctx.scale(-1, 1);
      }

      if (outlineOnly) {
        ctx.clearRect(0, 0, cropSize, cropSize);
        ctx.drawImage(fgCanvas, 0, 0);
      } else {
        ctx.filter = "blur(10px)";
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.filter = "none";
        ctx.drawImage(fgCanvas, 0, 0);
      }

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
  }, [enabled, stream, mirrored, outlineOnly]);

  return { canvasRef };
}
