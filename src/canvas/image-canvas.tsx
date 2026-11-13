"use client";

import { ReactElement, ReactNode, useCallback, useRef } from "react";
import {
  CanvasTransform,
  MAX_SCALE,
  MIN_SCALE,
  Point,
  Size,
  getCssTransform,
  getNormalizedPointFromScreen,
  isNormalizedPoint,
} from "./canvas-math";
import styles from "./canvas.module.css";
import { ImageLoadError } from "./image-load-error";
import { ImageLoading } from "./image-loading";
import { useCanvasGestures } from "./use-canvas-gestures";
import { useCanvasTransform } from "./use-canvas-transform";
import { useElementSize } from "./use-element-size";
import { useImageLoader } from "./use-image-loader";
import { ZoomControls } from "./zoom-controls";

/** What an overlay needs to place things on the image: everything is known and non-null. */
export interface CanvasOverlayState {
  transform: CanvasTransform;
  imageSize: Size;
  viewportSize: Size;
  /** Somewhere for keyboard focus to go when the element holding it disappears. Stable between renders. */
  focusCanvas: () => void;
}

export interface ImageCanvasProps {
  src: string;
  alt: string;
  /** A click (not a drag) on the image, as a fraction of the image size (0..1). */
  onImageClick?: (normalizedPoint: Point) => void;
  /** A click (not a drag) on the canvas around the image. */
  onBackgroundClick?: () => void;
  /** Drawn above the image and below the zoom controls, re-rendered on every pan and zoom. */
  renderOverlay?: (overlay: CanvasOverlayState) => ReactNode;
}

export function ImageCanvas({
  src,
  alt,
  onImageClick,
  onBackgroundClick,
  renderOverlay,
}: ImageCanvasProps): ReactElement {
  // The viewport fills the canvas, so the canvas's size and top-left corner
  // are the viewport's: one ref serves measuring and the wheel listener.
  const canvasRef = useRef<HTMLElement>(null);
  const viewportSize = useElementSize(canvasRef);
  const { status, naturalSize, retry } = useImageLoader(src);
  const { transform, panBy, zoomAt, zoomIn, zoomOut, fitToScreen } =
    useCanvasTransform(naturalSize, viewportSize);

  function handleTap(canvasPoint: Point): void {
    if (!transform || !naturalSize) {
      return;
    }
    const normalizedPoint = getNormalizedPointFromScreen(
      canvasPoint,
      naturalSize,
      transform
    );
    if (isNormalizedPoint(normalizedPoint)) {
      onImageClick?.(normalizedPoint);
    } else {
      onBackgroundClick?.();
    }
  }

  const gestures = useCanvasGestures(canvasRef, {
    panBy,
    zoomAt,
    onTap: handleTap,
  });

  const isLoading = status === "loading";
  const hasError = status === "error";
  const canShowImage = transform !== null && naturalSize !== null;
  const canShowOverlay = canShowImage && viewportSize !== null;

  // Stable, so overlays can list it as an effect dependency.
  const focusCanvas = useCallback((): void => {
    canvasRef.current?.focus();
  }, []);

  function handleRetry(): void {
    // "Try again" unmounts while the image reloads; without this, keyboard
    // focus would drop to the top of the page.
    focusCanvas();
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

      {/* A sibling of the viewport, not a child: pressing a pin or a thread
          must never start a pan. */}
      {canShowOverlay && renderOverlay
        ? renderOverlay({
            transform,
            imageSize: naturalSize,
            viewportSize,
            focusCanvas,
          })
        : null}

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
