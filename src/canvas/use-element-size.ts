import { RefObject, useEffect, useState } from "react";
import { Size } from "./canvas-math";

/**
 * The element's border-box size (everything it covers on screen, padding and
 * border included), kept up to date on resize; null until measured.
 */
export function useElementSize(ref: RefObject<HTMLElement>): Size | null {
  const [size, setSize] = useState<Size | null>(null);

  useEffect((): (() => void) | undefined => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries): void => {
      const borderBox = entries[0]?.borderBoxSize[0];
      if (!borderBox) {
        return;
      }
      // Inline and block size are width and height in a horizontal layout.
      setSize({ width: borderBox.inlineSize, height: borderBox.blockSize });
    });
    observer.observe(element, { box: "border-box" });

    return (): void => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
