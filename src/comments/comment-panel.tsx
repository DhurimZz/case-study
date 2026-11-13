import { ReactElement, ReactNode } from "react";
import {
  THREAD_MAX_HEIGHT,
  THREAD_WIDTH,
  getCssTranslate,
  getThreadPosition,
} from "./comment-layout";
import styles from "./comments.module.css";
import { Point } from "@/canvas/canvas-math";
import { SCROLLABLE_OVERLAY_PROPS } from "@/canvas/use-canvas-gestures";

export interface CommentPanelProps {
  /** Referenced by the pin's `aria-controls`. */
  id: string;
  /** Screen point of the pin the panel belongs to. */
  pinPoint: Point;
  label: string;
  children: ReactNode;
}

/** An open thread or the new-comment composer, placed next to its pin. */
export function CommentPanel({
  id,
  pinPoint,
  label,
  children,
}: CommentPanelProps): ReactElement {
  const position = getThreadPosition(pinPoint);

  return (
    <div
      id={id}
      role="dialog"
      aria-label={label}
      className={styles.panel}
      style={{
        width: THREAD_WIDTH,
        maxHeight: `min(${THREAD_MAX_HEIGHT}px, calc(100% - 2 * var(--space-edge)))`,
        transform: getCssTranslate(position),
      }}
      {...SCROLLABLE_OVERLAY_PROPS}
    >
      {children}
    </div>
  );
}
