import { Point } from "@/canvas/canvas-math";

// The one place for sizes that both the layout math and the rendered
// components read, so the two cannot drift apart.

/** Passed to every `CommentPin` (Liveblocks' default is also 32). */
export const PIN_SIZE = 32;
/** Width of an open thread and of the new-comment composer. */
export const THREAD_WIDTH = 320;
/** Taller threads scroll inside the panel. */
export const THREAD_MAX_HEIGHT = 480;
/** Screen pixels between a pin and its thread. */
export const THREAD_GAP = 8;
/** Screen pixels kept between a thread and the edge of the canvas. */
export const EDGE_MARGIN = 16;
/**
 * Screen pixels at the bottom of the canvas that a thread never slides into:
 * the zoom controls (52 px tall, 16 px from the edge, see `.zoomControls` in
 * canvas.module.css) are drawn above the comments and would cover its send
 * button. Plus a gap of 8 px.
 */
export const BOTTOM_RESERVED = 16 + 52 + 8;

export type ThreadSide = "left" | "right";

/**
 * A thread opens to the right of its pin when it fits before the right edge
 * of the visible canvas. Otherwise it opens on the side with more room: near
 * the right edge that is the left, inwards; on a screen too narrow for
 * either side it is the side that clips least.
 *
 * The width is the fixed THREAD_WIDTH, never a measured one, so typing or a
 * growing thread cannot flip it; only the pin moving can.
 */
export function getThreadSide(
  pinPoint: Point,
  canvasWidth: number
): ThreadSide {
  const roomOnRight = canvasWidth - EDGE_MARGIN - (pinPoint.x + PIN_SIZE);
  const roomOnLeft = pinPoint.x - EDGE_MARGIN;
  const fitsOnRight = roomOnRight >= THREAD_GAP + THREAD_WIDTH;

  if (fitsOnRight) {
    return "right";
  }
  return roomOnLeft > roomOnRight ? "left" : "right";
}

/** Screen x of the panel's left edge. */
export function getThreadLeft(pinPoint: Point, side: ThreadSide): number {
  if (side === "right") {
    return pinPoint.x + PIN_SIZE + THREAD_GAP;
  }
  return pinPoint.x - THREAD_GAP - THREAD_WIDTH;
}

/**
 * Screen y of the panel's top edge: level with the pin's top, moved up just
 * enough to keep the panel's bottom above BOTTOM_RESERVED, but never so far
 * that the panel's bottom is above the pin's bottom. The panel stays level
 * with its pin even when the pin is panned off screen.
 *
 * `panelHeight` is null until the panel has been measured once.
 */
export function getThreadTop(
  pinPoint: Point,
  panelHeight: number | null,
  canvasHeight: number
): number {
  if (panelHeight === null) {
    return pinPoint.y;
  }
  const lowestTopThatFits = canvasHeight - BOTTOM_RESERVED - panelHeight;
  const highestTopLevelWithPin = pinPoint.y + PIN_SIZE - panelHeight;
  return Math.max(
    highestTopLevelWithPin,
    Math.min(pinPoint.y, lowestTopThatFits)
  );
}

/** Tall enough to fill the canvas between the top margin and BOTTOM_RESERVED, at most THREAD_MAX_HEIGHT. */
export function getThreadMaxHeight(canvasHeight: number): number {
  return Math.min(
    THREAD_MAX_HEIGHT,
    canvasHeight - EDGE_MARGIN - BOTTOM_RESERVED
  );
}

export function getCssTranslate(point: Point): string {
  return `translate(${point.x}px, ${point.y}px)`;
}
