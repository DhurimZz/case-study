import { useCallback, useMemo, useState } from "react";
import {
  CanvasTransform,
  Point,
  Size,
  ZOOM_BUTTON_FACTOR,
  getCenter,
  getFitTransform,
  getPannedTransform,
  getZoomedTransform,
  isSameTransform,
} from "./canvas-math";

export interface UseCanvasTransformResult {
  /** The one pan and zoom state; null until the image and viewport have a size. */
  transform: CanvasTransform | null;
  panBy: (delta: Point) => void;
  zoomAt: (focalPoint: Point, factor: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
}

export function useCanvasTransform(
  imageSize: Size | null,
  viewportSize: Size | null
): UseCanvasTransformResult {
  // null means "fit to screen": the fit is derived from the sizes on every
  // render, so the image keeps fitting while the window resizes, until the
  // user pans or zooms for the first time.
  const [userTransform, setUserTransform] = useState<CanvasTransform | null>(
    null
  );

  const fitTransform = useMemo((): CanvasTransform | null => {
    if (!imageSize || !viewportSize) {
      return null;
    }
    return getFitTransform(imageSize, viewportSize);
  }, [imageSize, viewportSize]);

  const transform = userTransform ?? fitTransform;

  // Builds on the latest state, not the render's `transform`: several pointer
  // or wheel events can fire before React re-renders.
  const updateTransform = useCallback(
    (getNext: (current: CanvasTransform) => CanvasTransform): void => {
      setUserTransform((current): CanvasTransform | null => {
        const base = current ?? fitTransform;
        if (!base) {
          return null;
        }
        const next = getNext(base);
        // An update that changes nothing (zooming at a limit, a sideways
        // scroll) must not leave fit mode, or resizing stops re-fitting.
        if (isSameTransform(next, base)) {
          return current;
        }
        return next;
      });
    },
    [fitTransform]
  );

  function panBy(delta: Point): void {
    updateTransform(
      (current): CanvasTransform => getPannedTransform(current, delta)
    );
  }

  // Stable between renders because the wheel listener effect depends on it.
  const zoomAt = useCallback(
    (focalPoint: Point, factor: number): void => {
      updateTransform(
        (current): CanvasTransform =>
          getZoomedTransform(current, factor, focalPoint)
      );
    },
    [updateTransform]
  );

  function zoomIn(): void {
    if (viewportSize) {
      zoomAt(getCenter(viewportSize), ZOOM_BUTTON_FACTOR);
    }
  }

  function zoomOut(): void {
    if (viewportSize) {
      zoomAt(getCenter(viewportSize), 1 / ZOOM_BUTTON_FACTOR);
    }
  }

  function fitToScreen(): void {
    setUserTransform(null);
  }

  return { transform, panBy, zoomAt, zoomIn, zoomOut, fitToScreen };
}
