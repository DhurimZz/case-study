import {
  MouseEvent,
  PointerEvent,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Point,
  getPinchChange,
  getWheelZoomFactor,
  isDrag,
} from "./canvas-math";

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
  onClick: (event: MouseEvent<HTMLElement>) => void;
}

function getCanvasPoint(canvas: HTMLElement, clientPoint: Point): Point {
  const bounds = canvas.getBoundingClientRect();
  return { x: clientPoint.x - bounds.left, y: clientPoint.y - bounds.top };
}

function getClientPoint(event: MouseEvent<HTMLElement>): Point {
  return { x: event.clientX, y: event.clientY };
}

function isOverScrollableOverlay(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(`[${SCROLLABLE_OVERLAY_ATTRIBUTE}]`) !== null
  );
}

/**
 * Drag to pan with any pointer (mouse, pen, touch), pinch with two fingers to
 * zoom, click (a press that does not move) to tap, wheel or trackpad pinch
 * anywhere over the canvas, controls included, to zoom at the cursor.
 */
export function useCanvasGestures(
  canvasRef: RefObject<HTMLElement>,
  { panBy, zoomAt, onTap }: UseCanvasGesturesOptions
): CanvasGestureHandlers {
  // Every pointer pressed on the viewport, by id, at its last handled
  // position (client coordinates). One pointer pans, two pinch.
  const pointersRef = useRef(new Map<number, Point>());
  const downPointRef = useRef<Point>({ x: 0, y: 0 });
  // The handlers read the ref: a fast flick can deliver pointerup before
  // React re-renders. The state only drives the grabbing cursor.
  const isDraggingRef = useRef(false);
  // Whether the last finished press was a drag, read by the click handler.
  const wasDragRef = useRef(false);
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

  function handleDragStart(): void {
    isDraggingRef.current = true;
    setIsPanning(true);
  }

  function handlePressEnd(): void {
    isDraggingRef.current = false;
    setIsPanning(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>): void {
    if (event.button !== PRIMARY_BUTTON) {
      return;
    }

    const pointers = pointersRef.current;
    const point = getClientPoint(event);
    if (pointers.size === 0) {
      downPointRef.current = point;
      isDraggingRef.current = false;
    } else {
      // A second finger: this press is a pinch now, never a tap.
      handleDragStart();
    }
    // Keeps the moves coming when the pointer leaves the viewport mid-drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point);
  }

  function handlePinchMove(pointerId: number, point: Point): void {
    const pointers = pointersRef.current;
    const canvas = canvasRef.current;
    // The first two pointers pinch; a third finger only updates its position.
    const [firstId, secondId] = [...pointers.keys()];
    const first = pointers.get(firstId);
    const second = pointers.get(secondId);
    const isPinchingPointer = pointerId === firstId || pointerId === secondId;
    pointers.set(pointerId, point);
    if (!isPinchingPointer || !canvas || !first || !second) {
      return;
    }

    const nextFirst = pointerId === firstId ? point : first;
    const nextSecond = pointerId === secondId ? point : second;
    const change = getPinchChange([first, second], [nextFirst, nextSecond]);
    panBy(change.pan);
    zoomAt(getCanvasPoint(canvas, change.focalPoint), change.factor);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>): void {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      return;
    }

    const point = getClientPoint(event);
    if (pointers.size >= 2) {
      handlePinchMove(event.pointerId, point);
      return;
    }

    if (!isDraggingRef.current) {
      // A click jitters a pixel or two; only a real move starts panning. The
      // stored point stays where the press started, so the first pan
      // includes the distance moved so far.
      if (!isDrag(downPointRef.current, point)) {
        return;
      }
      handleDragStart();
    }
    pointers.set(event.pointerId, point);
    panBy({ x: point.x - previous.x, y: point.y - previous.y });
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>): void {
    const pointers = pointersRef.current;
    if (!pointers.delete(event.pointerId)) {
      return;
    }
    // After a pinch, the finger still down keeps panning from where it is.
    if (pointers.size > 0) {
      return;
    }

    wasDragRef.current = isDraggingRef.current;
    handlePressEnd();
  }

  // Also runs on lostpointercapture: when the browser takes the pointer away
  // (a context menu opening mid-drag) no pointerup arrives, and without this
  // plain hovering would keep panning. Never a tap.
  function handlePointerInterrupted(event: PointerEvent<HTMLElement>): void {
    const pointers = pointersRef.current;
    if (!pointers.delete(event.pointerId)) {
      return;
    }
    if (pointers.size === 0) {
      wasDragRef.current = true;
      handlePressEnd();
    }
  }

  // The tap happens on click, not on pointerup: on touch screens the browser
  // sends its click after pointerup, at the same spot, and whatever was drawn
  // there in between (the new pin, the composer's buttons) would receive it.
  // Acting on the click itself means nothing new is under the finger yet.
  function handleClick(event: MouseEvent<HTMLElement>): void {
    const canvas = canvasRef.current;
    if (wasDragRef.current || !canvas || !onTap) {
      return;
    }
    onTap(getCanvasPoint(canvas, getClientPoint(event)));
  }

  return {
    isPanning,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerInterrupted,
    onLostPointerCapture: handlePointerInterrupted,
    onClick: handleClick,
  };
}
