import { CommentPin } from "@liveblocks/react-ui";
import { ReactElement, Ref } from "react";
import { PIN_SIZE, getCssTranslate } from "./comment-layout";
import styles from "./comments.module.css";
import { Point } from "@/canvas/canvas-math";

export interface AnchoredPinProps {
  /** Screen point of the anchor; the pin's pointed top-left corner sits on it. */
  screenPoint: Point;
  /** Whose avatar the pin shows. */
  userId?: string;
  label: string;
  isOpen: boolean;
  isResolved?: boolean;
  /** Id of the panel this pin opens, while it is open. */
  panelId?: string;
  onClick?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}

export function AnchoredPin({
  screenPoint,
  userId,
  label,
  isOpen,
  isResolved = false,
  panelId,
  onClick,
  buttonRef,
}: AnchoredPinProps): ReactElement {
  // The wrapper is positioned, not the pin: Liveblocks' CSS sets the pin's
  // own transform to make its corner point at the spot.
  return (
    <div
      className={styles.pinPosition}
      style={{ transform: getCssTranslate(screenPoint) }}
      data-open={isOpen}
      data-resolved={isResolved}
    >
      <CommentPin
        ref={buttonRef}
        corner="top-left"
        size={PIN_SIZE}
        userId={userId}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onClick}
      />
    </div>
  );
}
