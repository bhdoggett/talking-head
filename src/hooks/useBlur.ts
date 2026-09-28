import { useRef, useEffect } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

export function useBlur(
  stream: MediaStream | null,
  blurAmount: number,
  mirrored: boolean,
  outlineOnly: boolean = false,
  zoom: number = 1,
) {
  const enabled = blurAmount > 0 || outlineOnly;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const animFrameRef = useRef<number>(0);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Ref so zoom changes don't tear down and reload the segmenter
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

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
    // Background layer only exists in blur mode (not outline)
    const bgCanvas = outlineOnly ? null : bgCanvasRef.current;
    const bgCtx = bgCanvas?.getContext("2d") ?? null;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play();
    videoElRef.current = video;

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d")!;

    let running = true;
    let segmenter: ImageSegmenter | null = null;
    let appliedBlur = "";

    // Blurs the full frame (person included) with CSS, since WebKit has no ctx.filter.
    // The canvas extends past the bubble by a margin so the blur's faded edges fall outside the
    // clip, while the in-bubble area stays pixel-aligned with the sharp foreground.
    const drawBlurredBackground = (
      target: HTMLCanvasElement,
      c: CanvasRenderingContext2D,
      cropSize: number,
      srcSize: number,
      sx: number,
      sy: number,
    ) => {
      const margin = Math.ceil(blurAmount * 2.5);
      const size = cropSize + margin * 2;
      const f = srcSize / cropSize; // source px per canvas px
      // Source square including margin, clamped to what the camera actually captured
      const ex = sx - margin * f;
      const ey = sy - margin * f;
      const rx0 = Math.max(0, ex);
      const ry0 = Math.max(0, ey);
      const rx1 = Math.min(video.videoWidth, ex + size * f);
      const ry1 = Math.min(video.videoHeight, ey + size * f);

      target.width = size;
      target.height = size;
      c.save();
      if (mirrored) {
        c.translate(size, 0);
        c.scale(-1, 1);
      }
      // Stretched underlay fills margin areas the camera didn't capture
      c.drawImage(video, rx0, ry0, rx1 - rx0, ry1 - ry0, 0, 0, size, size);
      c.drawImage(video, rx0, ry0, rx1 - rx0, ry1 - ry0, (rx0 - ex) / f, (ry0 - ey) / f, (rx1 - rx0) / f, (ry1 - ry0) / f);
      c.restore();

      const inset = `${(-margin / cropSize) * 100}%`;
      const extent = `${(size / cropSize) * 100}%`;
      const blur = `blur(${((blurAmount * canvas.clientWidth) / cropSize).toFixed(2)}px)`;
      const key = `${inset}|${blur}`;
      if (key !== appliedBlur) {
        Object.assign(target.style, { left: inset, top: inset, width: extent, height: extent, filter: blur });
        appliedBlur = key;
      }
    };

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
      // Zoom samples a smaller centered square and scales it up to fill the output
      const srcSize = cropSize / zoomRef.current;
      const sx = (srcW - srcSize) / 2;
      const sy = (srcH - srcSize) / 2;

      // Build the mask as an alpha channel from the confidence values
      const maskData = mask.getAsFloat32Array();
      if (maskCanvas.width !== srcW || maskCanvas.height !== srcH) {
        maskCanvas.width = srcW;
        maskCanvas.height = srcH;
      }
      const maskImageData = maskCtx.createImageData(srcW, srcH);
      for (let i = 0; i < maskData.length; i++) {
        maskImageData.data[i * 4] = 255;
        maskImageData.data[i * 4 + 1] = 255;
        maskImageData.data[i * 4 + 2] = 255;
        maskImageData.data[i * 4 + 3] = Math.round(maskData[i] * 255);
      }
      maskCtx.putImageData(maskImageData, 0, 0);
      mask.close();

      // Foreground: video with everything but the person masked away.
      // Video must be drawn first: WebKit ignores composite ops when the *source* is a video.
      const drawPerson = (target: HTMLCanvasElement, c: CanvasRenderingContext2D) => {
        target.width = cropSize;
        target.height = cropSize;
        c.save();
        if (mirrored) {
          c.translate(cropSize, 0);
          c.scale(-1, 1);
        }
        c.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, cropSize, cropSize);
        c.globalCompositeOperation = "destination-in";
        c.drawImage(maskCanvas, sx, sy, srcSize, srcSize, 0, 0, cropSize, cropSize);
        c.restore();
      };

      drawPerson(canvas, ctx);
      if (bgCanvas && bgCtx) {
        drawBlurredBackground(bgCanvas, bgCtx, cropSize, srcSize, sx, sy);
      }

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

  return { canvasRef, bgCanvasRef };
}
