"use client";

import { ReactElement, useRef } from "react";
import { MAX_SCALE, MIN_SCALE, getCssTransform } from "./canvas-math";
import styles from "./canvas.module.css";
import { ImageLoadError } from "./image-load-error";
import { ImageLoading } from "./image-loading";
import { useCanvasGestures } from "./use-canvas-gestures";
import { useCanvasTransform } from "./use-canvas-transform";
import { useElementSize } from "./use-element-size";
import { useImageLoader } from "./use-image-loader";
import { ZoomControls } from "./zoom-controls";

export interface ImageCanvasProps {
  src: string;
  alt: string;
}

export function ImageCanvas({ src, alt }: ImageCanvasProps): ReactElement {
  // The viewport fills the canvas, so the canvas's size and top-left corner
  // are the viewport's: one ref serves measuring and the wheel listener.
  const canvasRef = useRef<HTMLElement>(null);
  const viewportSize = useElementSize(canvasRef);
  const { status, naturalSize, retry } = useImageLoader(src);
  const { transform, panBy, zoomAt, zoomIn, zoomOut, fitToScreen } =
    useCanvasTransform(naturalSize, viewportSize);
  const gestures = useCanvasGestures(canvasRef, { panBy, zoomAt });

  const isLoading = status === "loading";
  const hasError = status === "error";
  const canShowImage = transform !== null && naturalSize !== null;

  function handleRetry(): void {
    // "Try again" unmounts while the image reloads; without this, keyboard
    // focus would drop to the top of the page.
    canvasRef.current?.focus();
    retry();
  }

  return (
    <section
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Image canvas"
      tabIndex={-1}
    >
      <div
        className={styles.viewport}
        data-panning={gestures.isPanning}
        onPointerDown={gestures.onPointerDown}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.onPointerUp}
        onPointerCancel={gestures.onPointerCancel}
        onLostPointerCapture={gestures.onLostPointerCapture}
      >
        {canShowImage ? (
          <div
            className={styles.world}
            style={{ transform: getCssTransform(transform) }}
          >
            <img
              className={styles.image}
              src={src}
              alt={alt}
              width={naturalSize.width}
              height={naturalSize.height}
              draggable={false}
            />
          </div>
        ) : null}
      </div>

      {isLoading ? <ImageLoading /> : null}
      {hasError ? <ImageLoadError onRetry={handleRetry} /> : null}
      {transform ? (
        <ZoomControls
          scale={transform.scale}
          canZoomIn={transform.scale < MAX_SCALE}
          canZoomOut={transform.scale > MIN_SCALE}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitToScreen={fitToScreen}
        />
      ) : null}
    </section>
  );
}
