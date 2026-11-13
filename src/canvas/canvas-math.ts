export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Maps image coordinates (pixels of the image at its natural size) to screen
 * coordinates (CSS pixels relative to the canvas viewport's top-left corner):
 *
 *   screen = image * scale + (x, y)
 *
 * `x` and `y` are where the image's top-left corner sits on screen, `scale` is
 * how many screen pixels one image pixel covers (1 = 100%).
 */
export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;
export const ZOOM_BUTTON_FACTOR = 1.25;
/** Screen pixels kept free around the image when it is fitted to the viewport. */
export const FIT_PADDING = 48;
/** Scale changes by e^(-deltaY * WHEEL_ZOOM_SPEED) per wheel event. */
export const WHEEL_ZOOM_SPEED = 0.002;
/** Trackpad pinch arrives as wheel events with `ctrlKey` set and much smaller deltas. */
export const PINCH_ZOOM_MULTIPLIER = 10;
/** `WheelEvent.DOM_DELTA_*`, redeclared so this module runs outside a browser. */
export const DOM_DELTA_LINE = 1;
export const DOM_DELTA_PAGE = 2;
/** Pixels per wheel "line", for browsers (Firefox) that report wheel deltas in lines. */
export const WHEEL_LINE_HEIGHT = 16;
/** Pixels per wheel "page", for systems set to scroll one screen at a time. */
export const WHEEL_PAGE_HEIGHT = 800;

/** The parts of a `WheelEvent` the zoom reads; a real `WheelEvent` fits it. */
export interface WheelInput {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

export function getScreenPoint(
  imagePoint: Point,
  transform: CanvasTransform
): Point {
  return {
    x: imagePoint.x * transform.scale + transform.x,
    y: imagePoint.y * transform.scale + transform.y,
  };
}

export function getImagePoint(
  screenPoint: Point,
  transform: CanvasTransform
): Point {
  return {
    x: (screenPoint.x - transform.x) / transform.scale,
    y: (screenPoint.y - transform.y) / transform.scale,
  };
}

export function getClampedScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function getPannedTransform(
  transform: CanvasTransform,
  delta: Point
): CanvasTransform {
  return {
    x: transform.x + delta.x,
    y: transform.y + delta.y,
    scale: transform.scale,
  };
}

export function getZoomedTransform(
  transform: CanvasTransform,
  factor: number,
  focalPoint: Point
): CanvasTransform {
  const scale = getClampedScale(transform.scale * factor);
  // The image point under the focal point must still be under it afterwards,
  // so solve `focalPoint = imagePoint * scale + offset` for the new offset.
  const imagePoint = getImagePoint(focalPoint, transform);

  return {
    x: focalPoint.x - imagePoint.x * scale,
    y: focalPoint.y - imagePoint.y * scale,
    scale,
  };
}

export function getFitTransform(
  imageSize: Size,
  viewportSize: Size
): CanvasTransform {
  const availableWidth = viewportSize.width - FIT_PADDING * 2;
  const availableHeight = viewportSize.height - FIT_PADDING * 2;
  // Capped at 1: a small image is shown at 100%, not blown up and blurred.
  const fitScale = Math.min(
    1,
    availableWidth / imageSize.width,
    availableHeight / imageSize.height
  );
  const scale = getClampedScale(fitScale);

  return {
    x: (viewportSize.width - imageSize.width * scale) / 2,
    y: (viewportSize.height - imageSize.height * scale) / 2,
    scale,
  };
}

export function getWheelZoomFactor(wheel: WheelInput): number {
  const deltaInPixels = getWheelDeltaInPixels(wheel);
  const speed = wheel.ctrlKey
    ? WHEEL_ZOOM_SPEED * PINCH_ZOOM_MULTIPLIER
    : WHEEL_ZOOM_SPEED;
  // Exponential so zooming in and back out by the same delta returns to the
  // same scale, and small trackpad deltas zoom proportionally less.
  return Math.exp(-deltaInPixels * speed);
}

function getWheelDeltaInPixels(wheel: WheelInput): number {
  if (wheel.deltaMode === DOM_DELTA_LINE) {
    return wheel.deltaY * WHEEL_LINE_HEIGHT;
  }
  if (wheel.deltaMode === DOM_DELTA_PAGE) {
    return wheel.deltaY * WHEEL_PAGE_HEIGHT;
  }
  return wheel.deltaY;
}

export function isSameTransform(
  a: CanvasTransform,
  b: CanvasTransform
): boolean {
  return a.x === b.x && a.y === b.y && a.scale === b.scale;
}

export function getCenter(size: Size): Point {
  return { x: size.width / 2, y: size.height / 2 };
}

/** CSS for a layer with `transform-origin: 0 0`, matching `getScreenPoint`. */
export function getCssTransform(transform: CanvasTransform): string {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
}
