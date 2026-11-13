import { PointerEvent, RefObject, useEffect, useRef, useState } from "react";
import { Point, getWheelZoomFactor, isDrag } from "./canvas-math";

const PRIMARY_BUTTON = 0;
const SCROLLABLE_OVERLAY_ATTRIBUTE = "data-scrollable-overlay";
/** Spread on overlay elements (a long comment thread) that scroll on wheel instead of zooming. */
export const SCROLLABLE_OVERLAY_PROPS = {
  [SCROLLABLE_OVERLAY_ATTRIBUTE]: true,
};

export interface UseCanvasGesturesOptions {
  panBy: (delta: Point) => void;
  zoomAt: (focalPoint: Point, factor: number) => void;
  /** A press that ended without becoming a drag, in canvas coordinates. */
  onTap?: (canvasPoint: Point) => void;
}

export interface CanvasGestureHandlers {
  isPanning: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
}

function getCanvasPoint(canvas: HTMLElement, clientPoint: Point): Point {
  const bounds = canvas.getBoundingClientRect();
  return { x: clientPoint.x - bounds.left, y: clientPoint.y - bounds.top };
}

function isOverScrollableOverlay(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(`[${SCROLLABLE_OVERLAY_ATTRIBUTE}]`) !== null
  );
}

/**
 * Drag to pan with any pointer (mouse, pen, touch), click (a press that does
 * not move) to tap, wheel or trackpad pinch anywhere over the canvas,
 * controls included, to zoom at the cursor.
 */
export function useCanvasGestures(
  canvasRef: RefObject<HTMLElement>,
  { panBy, zoomAt, onTap }: UseCanvasGesturesOptions
): CanvasGestureHandlers {
  // Only the first pointer that goes down pans. A second finger on a touch
  // screen would otherwise overwrite the last point and make the image jump.
  const activePointerIdRef = useRef<number | null>(null);
  const downPointRef = useRef<Point>({ x: 0, y: 0 });
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  // The handlers read the ref: a fast flick can deliver pointerup before
  // React re-renders. The state only drives the grabbing cursor.
  const isDraggingRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  useEffect((): (() => void) | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      // Plain scrolling over a long thread scrolls the thread; a pinch
      // (ctrlKey) still zooms the canvas instead of the browser page.
      const isPinch = event.ctrlKey;
      const shouldScrollOverlay =
        isOverScrollableOverlay(event.target) && !isPinch;
      if (shouldScrollOverlay) {
        return;
      }
      event.preventDefault();
      const focalPoint = getCanvasPoint(canvas, {
        x: event.clientX,
        y: event.clientY,
      });
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
    const isAlreadyPressed = activePointerIdRef.current !== null;
    if (!isPrimaryButton || isAlreadyPressed) {
      return;
    }

    // Keeps the moves coming when the pointer leaves the viewport mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    downPointRef.current = { x: event.clientX, y: event.clientY };
    lastPointRef.current = downPointRef.current;
    isDraggingRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>): void {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    if (!isDraggingRef.current) {
      if (!isDrag(downPointRef.current, point)) {
        return;
      }
      isDraggingRef.current = true;
      setIsPanning(true);
    }

    // The first pan after the threshold includes the distance moved so far,
    // because lastPointRef still holds the point where the press started.
    panBy({
      x: point.x - lastPointRef.current.x,
      y: point.y - lastPointRef.current.y,
    });
    lastPointRef.current = point;
  }

  function handlePressEnd(): void {
    activePointerIdRef.current = null;
    isDraggingRef.current = false;
    setIsPanning(false);
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>): void {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }

    const wasTap = !isDraggingRef.current;
    handlePressEnd();
    const canvas = canvasRef.current;
    if (wasTap && canvas && onTap) {
      onTap(getCanvasPoint(canvas, { x: event.clientX, y: event.clientY }));
    }
  }

  // Also runs on lostpointercapture: when the browser takes the pointer away
  // (a context menu opening mid-drag) no pointerup arrives, and without this
  // plain hovering would keep panning. Never a tap.
  function handlePointerInterrupted(event: PointerEvent<HTMLElement>): void {
    if (event.pointerId !== activePointerIdRef.current) {
      return;
    }
    handlePressEnd();
  }

  return {
    isPanning,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerInterrupted,
    onLostPointerCapture: handlePointerInterrupted,
  };
}
