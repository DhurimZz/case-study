import { PointerEvent, RefObject, useEffect, useRef, useState } from "react";
import { Point, getWheelZoomFactor } from "./canvas-math";

const PRIMARY_BUTTON = 0;

export interface UseCanvasGesturesOptions {
  panBy: (delta: Point) => void;
  zoomAt: (focalPoint: Point, factor: number) => void;
}

export interface CanvasGestureHandlers {
  isPanning: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Drag to pan with any pointer (mouse, pen, touch); wheel or trackpad pinch
 * anywhere over the canvas, controls included, to zoom at the cursor.
 */
export function useCanvasGestures(
  canvasRef: RefObject<HTMLElement>,
  { panBy, zoomAt }: UseCanvasGesturesOptions
): CanvasGestureHandlers {
  // Only the first pointer that goes down pans. A second finger on a touch
  // screen would otherwise overwrite the last point and make the image jump.
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect((): (() => void) | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      const focalPoint = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      zoomAt(focalPoint, getWheelZoomFactor(event));
    };

    // Not React's onWheel: React registers wheel listeners as passive, where
    // preventDefault() is ignored and the page would scroll or browser-zoom.
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return (): void => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [canvasRef, zoomAt]);

  function handlePointerDown(event: PointerEvent<HTMLElement>): void {
    const isPrimaryButton = event.button === PRIMARY_BUTTON;
    const isAlreadyPanning = activePointerIdRef.current !== null;
    if (!isPrimaryButton || isAlreadyPanning) {
      return;
    }

    // Keeps the moves coming when the pointer leaves the viewport mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>): void {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    const delta = {
      x: event.clientX - lastPointRef.current.x,
      y: event.clientY - lastPointRef.current.y,
    };
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    panBy(delta);
  }

  // Also runs on lostpointercapture: when the browser takes the pointer away
  // (a context menu opening mid-drag) no pointerup arrives, and without this
  // plain hovering would keep panning.
  function handlePointerEnd(event: PointerEvent<HTMLElement>): void {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    activePointerIdRef.current = null;
    setIsPanning(false);
  }

  return {
    isPanning,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onLostPointerCapture: handlePointerEnd,
  };
}
