import { CSSProperties } from "react";
import { Point, Size } from "@/canvas/canvas-math";

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

/** The bottom sheet's height limit, as a share of the canvas height, so part of the image stays visible above it. */
export const SHEET_HEIGHT_RATIO = 0.55;

export type ThreadSide = "left" | "right";
export type ThreadPlacement = ThreadSide | "sheet";

/**
 * A thread opens to the right of its pin when it fits before the right edge
 * of the visible canvas, otherwise to the left (inwards) when that fits. On a
 * screen too narrow for either side it opens as a sheet along the bottom,
 * instead of being cut off.
 *
 * The width is the fixed THREAD_WIDTH, never a measured one, so typing or a
 * growing thread cannot change the placement; only the pin moving can.
 */
export function getThreadPlacement(
  pinPoint: Point,
  canvasWidth: number
): ThreadPlacement {
  const neededRoom = THREAD_GAP + THREAD_WIDTH;
  const roomOnRight = canvasWidth - EDGE_MARGIN - (pinPoint.x + PIN_SIZE);
  const roomOnLeft = pinPoint.x - EDGE_MARGIN;

  if (roomOnRight >= neededRoom) {
    return "right";
  }
  if (roomOnLeft >= neededRoom) {
    return "left";
  }
  return "sheet";
}

export function getSheetMaxHeight(canvasHeight: number): number {
  return Math.min(
    THREAD_MAX_HEIGHT,
    Math.round(canvasHeight * SHEET_HEIGHT_RATIO)
  );
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

/**
 * Where and how big the panel is drawn. A sheet is anchored by its bottom
 * edge, above the zoom controls, so it needs no measured height; a panel
 * beside its pin uses `panelHeight` (null until measured) to fit vertically.
 */
export function getPanelStyle(
  placement: ThreadPlacement,
  pinPoint: Point,
  canvasSize: Size,
  panelHeight: number | null
): CSSProperties {
  if (placement === "sheet") {
    return {
      top: "auto",
      left: EDGE_MARGIN,
      right: EDGE_MARGIN,
      bottom: BOTTOM_RESERVED,
      maxHeight: getSheetMaxHeight(canvasSize.height),
    };
  }
  const position = {
    x: getThreadLeft(pinPoint, placement),
    y: getThreadTop(pinPoint, panelHeight, canvasSize.height),
  };
  return {
    width: THREAD_WIDTH,
    maxHeight: getThreadMaxHeight(canvasSize.height),
    transform: getCssTranslate(position),
  };
}
