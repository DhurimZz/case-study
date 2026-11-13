import { describe, expect, it } from "vitest";
import {
  CanvasTransform,
  DOM_DELTA_LINE,
  DOM_DELTA_PAGE,
  DRAG_THRESHOLD,
  FIT_PADDING,
  MAX_SCALE,
  MIN_SCALE,
  WheelInput,
  getCenter,
  getClampedScale,
  getCssTransform,
  getDistance,
  getFitTransform,
  getImagePoint,
  getImagePointFromNormalized,
  getNormalizedPoint,
  getNormalizedPointFromScreen,
  getPannedTransform,
  getScreenPoint,
  getScreenPointFromNormalized,
  getWheelZoomFactor,
  getZoomedTransform,
  isDrag,
  isNormalizedPoint,
  isSameTransform,
} from "./canvas-math";

const DOM_DELTA_PIXEL = 0;

describe("getScreenPoint", (): void => {
  it.each([
    { scale: 1, x: 0, y: 0, expected: { x: 100, y: 50 } },
    { scale: 1, x: 20, y: 10, expected: { x: 120, y: 60 } },
    { scale: 2, x: 20, y: 10, expected: { x: 220, y: 110 } },
    { scale: 0.5, x: 20, y: 10, expected: { x: 70, y: 35 } },
  ])(
    "maps image (100, 50) at scale $scale, offset ($x, $y)",
    ({ scale, x, y, expected }): void => {
      expect(getScreenPoint({ x: 100, y: 50 }, { x, y, scale })).toEqual(
        expected
      );
    }
  );
});

describe("getImagePoint", (): void => {
  it("is the inverse of getScreenPoint", (): void => {
    const transforms: CanvasTransform[] = [
      { x: 0, y: 0, scale: 1 },
      { x: -340, y: 125, scale: 2.5 },
      { x: 48, y: 12, scale: 0.3 },
      { x: 0, y: 0, scale: MAX_SCALE },
    ];
    const imagePoint = { x: 731, y: 1204 };

    for (const transform of transforms) {
      const screenPoint = getScreenPoint(imagePoint, transform);
      const roundTrip = getImagePoint(screenPoint, transform);
      expect(roundTrip.x).toBeCloseTo(imagePoint.x);
      expect(roundTrip.y).toBeCloseTo(imagePoint.y);
    }
  });
});

describe("normalized points", (): void => {
  const imageSize = { width: 1200, height: 1600 };

  it("divides by the image size, so corners are 0 and 1", (): void => {
    expect(getNormalizedPoint({ x: 0, y: 0 }, imageSize)).toEqual({
      x: 0,
      y: 0,
    });
    expect(getNormalizedPoint({ x: 1200, y: 1600 }, imageSize)).toEqual({
      x: 1,
      y: 1,
    });
    expect(getNormalizedPoint({ x: 300, y: 400 }, imageSize)).toEqual({
      x: 0.25,
      y: 0.25,
    });
  });

  it("converts back to the same image point", (): void => {
    const imagePoint = { x: 731, y: 1204 };
    const normalized = getNormalizedPoint(imagePoint, imageSize);
    const roundTrip = getImagePointFromNormalized(normalized, imageSize);
    expect(roundTrip.x).toBeCloseTo(imagePoint.x);
    expect(roundTrip.y).toBeCloseTo(imagePoint.y);
  });

  it.each([
    { point: { x: 0, y: 0 }, expected: true },
    { point: { x: 1, y: 1 }, expected: true },
    { point: { x: 0.5, y: 0.999 }, expected: true },
    { point: { x: -0.001, y: 0.5 }, expected: false },
    { point: { x: 0.5, y: 1.001 }, expected: false },
    { point: { x: Number.NaN, y: 0.5 }, expected: false },
    { point: { x: 0.5, y: Number.POSITIVE_INFINITY }, expected: false },
    { point: { x: 640, y: 380 }, expected: false },
  ])(
    "isNormalizedPoint($point.x, $point.y) is $expected",
    ({ point, expected }): void => {
      expect(isNormalizedPoint(point)).toBe(expected);
    }
  );
});

describe("comment anchoring", (): void => {
  const imageSize = { width: 1200, height: 1600 };
  const transforms: CanvasTransform[] = [
    { x: 0, y: 0, scale: 1 },
    { x: 412, y: 48, scale: 0.43 },
    { x: -2350, y: -4100, scale: MAX_SCALE },
    { x: 610, y: 395, scale: MIN_SCALE },
  ];

  // The same two functions the canvas (click) and the comment layer (pins) call.
  it("puts the pin exactly where the user clicked", (): void => {
    const click = { x: 640, y: 380 };
    for (const transform of transforms) {
      const anchor = getNormalizedPointFromScreen(click, imageSize, transform);
      const pin = getScreenPointFromNormalized(anchor, imageSize, transform);
      expect(pin.x).toBeCloseTo(click.x);
      expect(pin.y).toBeCloseTo(click.y);
    }
  });

  it("keeps the pin on the same image pixel at every pan and zoom", (): void => {
    const anchor = { x: 0.62, y: 0.31 };
    const anchoredPixel = getImagePointFromNormalized(anchor, imageSize);

    for (const transform of transforms) {
      const pin = getScreenPointFromNormalized(anchor, imageSize, transform);
      const pixelUnderPin = getImagePoint(pin, transform);
      expect(pixelUnderPin.x).toBeCloseTo(anchoredPixel.x);
      expect(pixelUnderPin.y).toBeCloseTo(anchoredPixel.y);
    }
  });

  it("moves the pin with the image when zooming around the cursor", (): void => {
    const anchor = { x: 0.62, y: 0.31 };
    const before: CanvasTransform = { x: 412, y: 48, scale: 0.43 };
    const after = getZoomedTransform(before, 2, { x: 500, y: 300 });

    const pinBefore = getScreenPointFromNormalized(anchor, imageSize, before);
    const pinAfter = getScreenPointFromNormalized(anchor, imageSize, after);
    // Twice the scale: the pin is twice as far from the focal point.
    expect(pinAfter.x - 500).toBeCloseTo((pinBefore.x - 500) * 2);
    expect(pinAfter.y - 300).toBeCloseTo((pinBefore.y - 300) * 2);
  });

  it("reports a click beside the image as off the image", (): void => {
    const fit: CanvasTransform = { x: 376, y: 48, scale: 0.44 };
    const besideImage = getNormalizedPointFromScreen(
      { x: 100, y: 400 },
      imageSize,
      fit
    );
    expect(isNormalizedPoint(besideImage)).toBe(false);
  });
});

describe("getDistance", (): void => {
  it("is the straight-line distance", (): void => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("isDrag", (): void => {
  const start = { x: 100, y: 100 };

  it.each([
    { moved: { x: 100, y: 100 }, expected: false },
    { moved: { x: 102, y: 101 }, expected: false },
    { moved: { x: 103.9, y: 100 }, expected: false },
    { moved: { x: 100 + DRAG_THRESHOLD, y: 100 }, expected: true },
    { moved: { x: 97, y: 96 }, expected: true },
  ])(
    "moving to ($moved.x, $moved.y) is a drag: $expected",
    ({ moved, expected }): void => {
      expect(isDrag(start, moved)).toBe(expected);
    }
  );
});

describe("getClampedScale", (): void => {
  it.each([
    { scale: 0.01, expected: MIN_SCALE },
    { scale: -1, expected: MIN_SCALE },
    { scale: MIN_SCALE, expected: MIN_SCALE },
    { scale: 1.5, expected: 1.5 },
    { scale: MAX_SCALE, expected: MAX_SCALE },
    { scale: 50, expected: MAX_SCALE },
  ])("clamps $scale to $expected", ({ scale, expected }): void => {
    expect(getClampedScale(scale)).toBe(expected);
  });
});

describe("getPannedTransform", (): void => {
  it("moves the offset by the delta and keeps the scale", (): void => {
    const panned = getPannedTransform(
      { x: 10, y: 20, scale: 3 },
      { x: -15, y: 40 }
    );
    expect(panned).toEqual({ x: -5, y: 60, scale: 3 });
  });
});

describe("getZoomedTransform", (): void => {
  const transform: CanvasTransform = { x: 120, y: -80, scale: 1.5 };
  const focalPoint = { x: 400, y: 300 };

  it.each([
    { name: "zooming in", factor: 1.25 },
    { name: "zooming out", factor: 0.8 },
    { name: "zooming past the maximum", factor: 100 },
    { name: "zooming past the minimum", factor: 0.001 },
  ])(
    "keeps the focal point on the same image point when $name",
    ({ factor }): void => {
      const imagePointBefore = getImagePoint(focalPoint, transform);
      const zoomed = getZoomedTransform(transform, factor, focalPoint);
      const imagePointAfter = getImagePoint(focalPoint, zoomed);

      expect(imagePointAfter.x).toBeCloseTo(imagePointBefore.x);
      expect(imagePointAfter.y).toBeCloseTo(imagePointBefore.y);
    }
  );

  it("clamps the scale to the limits", (): void => {
    expect(getZoomedTransform(transform, 100, focalPoint).scale).toBe(
      MAX_SCALE
    );
    expect(getZoomedTransform(transform, 0.001, focalPoint).scale).toBe(
      MIN_SCALE
    );
  });

  it("does not move the image when the scale is already at a limit", (): void => {
    const atMax: CanvasTransform = { x: 30, y: 40, scale: MAX_SCALE };
    expect(getZoomedTransform(atMax, 1.25, focalPoint)).toEqual(atMax);
  });
});

describe("getFitTransform", (): void => {
  it("shrinks a large image to fit inside the padding and centers it", (): void => {
    const fit = getFitTransform(
      { width: 1200, height: 1600 },
      { width: 1000, height: 896 }
    );
    // Height is the limit: (896 - 2 * 48) / 1600 = 0.5
    expect(fit.scale).toBe(0.5);
    expect(fit.x).toBe((1000 - 600) / 2);
    expect(fit.y).toBe(FIT_PADDING);
  });

  it("shows a small image at 100% instead of blowing it up", (): void => {
    const fit = getFitTransform(
      { width: 200, height: 100 },
      { width: 1000, height: 800 }
    );
    expect(fit).toEqual({ x: 400, y: 350, scale: 1 });
  });

  it("never goes below the minimum scale, even in a tiny viewport", (): void => {
    const fit = getFitTransform(
      { width: 1200, height: 1600 },
      { width: 80, height: 80 }
    );
    expect(fit.scale).toBe(MIN_SCALE);
  });
});

describe("getWheelZoomFactor", (): void => {
  function getWheel(deltaY: number, deltaMode = DOM_DELTA_PIXEL): WheelInput {
    return { deltaY, deltaMode, ctrlKey: false };
  }

  it("zooms in when scrolling up and out when scrolling down", (): void => {
    expect(getWheelZoomFactor(getWheel(-100))).toBeGreaterThan(1);
    expect(getWheelZoomFactor(getWheel(100))).toBeLessThan(1);
    expect(getWheelZoomFactor(getWheel(0))).toBe(1);
  });

  it("returns to the same scale after scrolling up and down by the same amount", (): void => {
    const zoomIn = getWheelZoomFactor(getWheel(-120));
    const zoomOut = getWheelZoomFactor(getWheel(120));
    expect(zoomIn * zoomOut).toBeCloseTo(1);
  });

  it("treats a line delta like 16 pixels", (): void => {
    expect(getWheelZoomFactor(getWheel(3, DOM_DELTA_LINE))).toBeCloseTo(
      getWheelZoomFactor(getWheel(48))
    );
  });

  it("treats a page delta like 800 pixels", (): void => {
    expect(getWheelZoomFactor(getWheel(1, DOM_DELTA_PAGE))).toBeCloseTo(
      getWheelZoomFactor(getWheel(800))
    );
  });

  it("zooms 10 times faster for a trackpad pinch (ctrlKey)", (): void => {
    const pinch = getWheelZoomFactor({ ...getWheel(-5), ctrlKey: true });
    expect(pinch).toBeCloseTo(getWheelZoomFactor(getWheel(-50)));
  });
});

describe("isSameTransform", (): void => {
  it("compares offset and scale", (): void => {
    const transform: CanvasTransform = { x: 1, y: 2, scale: 3 };
    expect(isSameTransform(transform, { x: 1, y: 2, scale: 3 })).toBe(true);
    expect(isSameTransform(transform, { x: 1, y: 2, scale: 4 })).toBe(false);
    expect(isSameTransform(transform, { x: 0, y: 2, scale: 3 })).toBe(false);
  });

  it("is true for a zoom at the limit, which must not count as a change", (): void => {
    const atMax: CanvasTransform = { x: 30, y: 40, scale: MAX_SCALE };
    const zoomed = getZoomedTransform(atMax, 1.25, { x: 400, y: 300 });
    expect(isSameTransform(zoomed, atMax)).toBe(true);
  });
});

describe("getCenter", (): void => {
  it("returns the middle of a size", (): void => {
    expect(getCenter({ width: 1280, height: 720 })).toEqual({ x: 640, y: 360 });
  });
});

describe("getCssTransform", (): void => {
  it("translates first, then scales, so it matches getScreenPoint", (): void => {
    expect(getCssTransform({ x: 20, y: -10.5, scale: 2 })).toBe(
      "translate(20px, -10.5px) scale(2)"
    );
  });
});
