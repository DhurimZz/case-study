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

/** Screen position of the thread panel's top-left corner for a pin at `pinPoint`. */
export function getThreadPosition(pinPoint: Point): Point {
  return { x: pinPoint.x + PIN_SIZE + THREAD_GAP, y: pinPoint.y };
}

export function getCssTranslate(point: Point): string {
  return `translate(${point.x}px, ${point.y}px)`;
}
