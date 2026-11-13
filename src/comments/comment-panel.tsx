import { ReactElement, ReactNode, useRef } from "react";
import {
  THREAD_WIDTH,
  getCssTranslate,
  getThreadLeft,
  getThreadMaxHeight,
  getThreadSide,
  getThreadTop,
} from "./comment-layout";
import styles from "./comments.module.css";
import { Point, Size } from "@/canvas/canvas-math";
import { SCROLLABLE_OVERLAY_PROPS } from "@/canvas/use-canvas-gestures";
import { useElementSize } from "@/canvas/use-element-size";

export interface CommentPanelProps {
  /** Referenced by the pin's `aria-controls`. */
  id: string;
  /** Screen point of the pin the panel belongs to. */
  pinPoint: Point;
  /** The visible canvas: its right edge decides the side, its height the vertical fit. */
  canvasSize: Size;
  label: string;
  children: ReactNode;
}

/** An open thread or the new-comment composer, placed next to its pin. */
export function CommentPanel({
  id,
  pinPoint,
  canvasSize,
  label,
  children,
}: CommentPanelProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const panelSize = useElementSize(panelRef);

  const side = getThreadSide(pinPoint, canvasSize.width);
  const position = {
    x: getThreadLeft(pinPoint, side),
    y: getThreadTop(pinPoint, panelSize?.height ?? null, canvasSize.height),
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      className={styles.panel}
      data-side={side}
      style={{
        width: THREAD_WIDTH,
        maxHeight: getThreadMaxHeight(canvasSize.height),
        transform: getCssTranslate(position),
      }}
      {...SCROLLABLE_OVERLAY_PROPS}
    >
      {children}
    </div>
  );
}
