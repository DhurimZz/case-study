import { RefObject, useEffect, useState } from "react";
import { Size } from "./canvas-math";

/** The element's content size, kept up to date on resize; null until measured. */
export function useElementSize(ref: RefObject<HTMLElement>): Size | null {
  const [size, setSize] = useState<Size | null>(null);

  useEffect((): (() => void) | undefined => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries): void => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
