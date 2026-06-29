import { useRef, useEffect } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

export function useBlur(
  stream: MediaStream | null,
  blurAmount: number,
  mirrored: boolean,
  outlineOnly: boolean = false,
) {
  const enabled = blurAmount > 0 || outlineOnly;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
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

    const bgCanvas = document.createElement("canvas");
    const bgCtx = bgCanvas.getContext("2d")!;
    const fgCanvas = document.createElement("canvas");
    const fgCtx = fgCanvas.getContext("2d")!;

    let running = true;
    let segmenter: ImageSegmenter | null = null;

    const processFrame = () => {
      if (!running || !segmenter || video.readyState < 2) {
        if (running) {
          animFrameRef.current = requestAnimationFrame(processFrame);
        }
        return;
      }

      const result = segmenter.segmentForVideo(video, performance.now());
      const mask = result.confidenceMasks?.[0];
      if (!mask) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      const cropSize = Math.min(srcW, srcH);
      const sx = (srcW - cropSize) / 2;
      const sy = (srcH - cropSize) / 2;

      canvas.width = cropSize;
      canvas.height = cropSize;
      bgCanvas.width = cropSize;
      bgCanvas.height = cropSize;
      fgCanvas.width = cropSize;
      fgCanvas.height = cropSize;

      // Build mask as ImageData from the confidence mask
      const maskData = mask.getAsFloat32Array();
      const maskImageData = fgCtx.createImageData(srcW, srcH);
      for (let i = 0; i < maskData.length; i++) {
        const a = Math.round(maskData[i] * 255);
        maskImageData.data[i * 4] = 255;
        maskImageData.data[i * 4 + 1] = 255;
        maskImageData.data[i * 4 + 2] = 255;
        maskImageData.data[i * 4 + 3] = a;
      }

      // Draw mask to a temp canvas at full resolution, then crop
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = srcW;
      maskCanvas.height = srcH;
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.putImageData(maskImageData, 0, 0);

      // Foreground: mask + sharp image
      fgCtx.clearRect(0, 0, cropSize, cropSize);
      fgCtx.drawImage(maskCanvas, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
      fgCtx.globalCompositeOperation = "source-in";
      fgCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
      fgCtx.globalCompositeOperation = "source-over";

      ctx.save();
      if (mirrored) {
        ctx.translate(cropSize, 0);
        ctx.scale(-1, 1);
      }

      if (outlineOnly) {
        ctx.clearRect(0, 0, cropSize, cropSize);
        ctx.drawImage(fgCanvas, 0, 0);
      } else {
        // Background: image with person cut out
        bgCtx.clearRect(0, 0, cropSize, cropSize);
        bgCtx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
        bgCtx.globalCompositeOperation = "destination-out";
        bgCtx.drawImage(maskCanvas, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
        bgCtx.globalCompositeOperation = "source-over";

        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.filter = "none";
        ctx.drawImage(fgCanvas, 0, 0);
      }

      ctx.restore();
      mask.close();

      if (running) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
      );
      if (!running) return;
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      if (!running) {
        segmenter.close();
        return;
      }
      segmenterRef.current = segmenter;
      processFrame();
    })();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      if (segmenterRef.current) {
        segmenterRef.current.close();
        segmenterRef.current = null;
      }
      video.pause();
      video.srcObject = null;
      videoElRef.current = null;
    };
  }, [enabled, blurAmount, stream, mirrored, outlineOnly]);

  return { canvasRef };
}
