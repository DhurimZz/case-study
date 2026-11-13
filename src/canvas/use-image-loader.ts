import { useEffect, useState } from "react";
import { Size } from "./canvas-math";

export type ImageLoadStatus = "loading" | "loaded" | "error";

export interface ImageLoadState {
  status: ImageLoadStatus;
  /** The image's size in image pixels; null until it has loaded. */
  naturalSize: Size | null;
}

export interface UseImageLoaderResult extends ImageLoadState {
  retry: () => void;
}

const LOADING_STATE: ImageLoadState = { status: "loading", naturalSize: null };
const ERROR_STATE: ImageLoadState = { status: "error", naturalSize: null };

export function useImageLoader(src: string): UseImageLoaderResult {
  const [state, setState] = useState<ImageLoadState>(LOADING_STATE);
  const [attempt, setAttempt] = useState(0);

  useEffect((): (() => void) => {
    // Loaded off-DOM instead of through <img onLoad>: the natural size is
    // known before the first paint, and a load that completes before React
    // hydrates cannot be missed.
    const image = new Image();

    image.onload = (): void => {
      // Comment positions are relative to the natural size, so an image
      // without one (for example an SVG with no width and height) is unusable.
      const hasNaturalSize = image.naturalWidth > 0 && image.naturalHeight > 0;
      if (!hasNaturalSize) {
        setState(ERROR_STATE);
        return;
      }
      setState({
        status: "loaded",
        naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
      });
    };
    image.onerror = (): void => {
      setState(ERROR_STATE);
    };
    image.src = src;

    return (): void => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src, attempt]);

  function retry(): void {
    setState(LOADING_STATE);
    setAttempt((current): number => current + 1);
  }

  return { ...state, retry };
}
