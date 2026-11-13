import { describe, expect, it } from "vitest";
import {
  BOTTOM_RESERVED,
  EDGE_MARGIN,
  PIN_SIZE,
  THREAD_GAP,
  THREAD_MAX_HEIGHT,
  THREAD_WIDTH,
  getThreadLeft,
  getThreadMaxHeight,
  getThreadSide,
  getThreadTop,
} from "./comment-layout";

const CANVAS_WIDTH = 1280;
/** Pin plus gap plus thread: 360 px to the right of the pin's anchor. */
const NEEDED_ON_RIGHT = PIN_SIZE + THREAD_GAP + THREAD_WIDTH;
/** The last pin x where a right-side thread still fits. */
const LAST_X_FOR_RIGHT = CANVAS_WIDTH - EDGE_MARGIN - NEEDED_ON_RIGHT;

describe("getThreadSide", (): void => {
  it.each([
    { name: "far left", x: 40, expected: "right" },
    { name: "middle", x: 600, expected: "right" },
    {
      name: "exactly at the last x that fits",
      x: LAST_X_FOR_RIGHT,
      expected: "right",
    },
    { name: "one pixel past it", x: LAST_X_FOR_RIGHT + 1, expected: "left" },
    { name: "at the right edge", x: CANVAS_WIDTH - PIN_SIZE, expected: "left" },
  ])("opens $expected for a pin $name", ({ x, expected }): void => {
    expect(getThreadSide({ x, y: 200 }, CANVAS_WIDTH)).toBe(expected);
  });

  it("does not depend on the pin's height on screen", (): void => {
    expect(getThreadSide({ x: 1100, y: -500 }, CANVAS_WIDTH)).toBe("left");
    expect(getThreadSide({ x: 1100, y: 5000 }, CANVAS_WIDTH)).toBe("left");
  });

  describe("when neither side fits (narrow canvas)", (): void => {
    const narrowWidth = 375;

    it("opens on the right when there is more room there", (): void => {
      expect(getThreadSide({ x: 100, y: 200 }, narrowWidth)).toBe("right");
    });

    it("opens on the left when there is more room there", (): void => {
      expect(getThreadSide({ x: 250, y: 200 }, narrowWidth)).toBe("left");
    });

    it("keeps the default right side when both sides have the same room", (): void => {
      // Room on the left: x - 16. On the right: 375 - 16 - (x + 32) = 327 - x.
      // Equal at x = 171.5.
      expect(getThreadSide({ x: 171.5, y: 200 }, narrowWidth)).toBe("right");
      expect(getThreadSide({ x: 172, y: 200 }, narrowWidth)).toBe("left");
    });
  });
});

describe("getThreadLeft", (): void => {
  const pin = { x: 900, y: 200 };

  it("starts right after the pin and the gap on the right side", (): void => {
    expect(getThreadLeft(pin, "right")).toBe(900 + PIN_SIZE + THREAD_GAP);
  });

  it("ends one gap before the pin on the left side", (): void => {
    const left = getThreadLeft(pin, "left");
    expect(left + THREAD_WIDTH + THREAD_GAP).toBe(pin.x);
  });

  it("keeps a left thread inside the canvas whenever getThreadSide chose left because it fits", (): void => {
    const pinNearEdge = { x: LAST_X_FOR_RIGHT + 1, y: 200 };
    const side = getThreadSide(pinNearEdge, CANVAS_WIDTH);
    expect(side).toBe("left");
    expect(getThreadLeft(pinNearEdge, side)).toBeGreaterThanOrEqual(
      EDGE_MARGIN
    );
  });
});

describe("getThreadTop", (): void => {
  const canvasHeight = 800;
  const panelHeight = 300;

  it("is level with the pin's top when the panel fits below", (): void => {
    expect(getThreadTop({ x: 0, y: 200 }, panelHeight, canvasHeight)).toBe(200);
  });

  it("slides up just enough to stay above the reserved bottom band", (): void => {
    const top = getThreadTop({ x: 0, y: 600 }, panelHeight, canvasHeight);
    expect(top + panelHeight).toBe(canvasHeight - BOTTOM_RESERVED);
  });

  it("keeps a composer's send button clear of the zoom controls", (): void => {
    // Review finding: a click at (1100, 690) on a 1280 by 800 canvas used to
    // put the empty composer (94 px) at 690..784, under the zoom controls,
    // which start at 800 - 16 - 52 = 732.
    const composerHeight = 94;
    const top = getThreadTop({ x: 1100, y: 690 }, composerHeight, 800);
    expect(top + composerHeight).toBeLessThanOrEqual(732);
  });

  it("never slides so far that the panel's bottom is above the pin's bottom", (): void => {
    const pinBelowCanvas = { x: 0, y: 1000 };
    const top = getThreadTop(pinBelowCanvas, panelHeight, canvasHeight);
    expect(top + panelHeight).toBe(pinBelowCanvas.y + PIN_SIZE);
  });

  it("follows a pin panned above the canvas", (): void => {
    expect(getThreadTop({ x: 0, y: -150 }, panelHeight, canvasHeight)).toBe(
      -150
    );
  });

  it("uses the pin's top until the panel has been measured", (): void => {
    expect(getThreadTop({ x: 0, y: 700 }, null, canvasHeight)).toBe(700);
  });
});

describe("getThreadMaxHeight", (): void => {
  it("is the constant on a tall canvas", (): void => {
    expect(getThreadMaxHeight(1000)).toBe(THREAD_MAX_HEIGHT);
  });

  it("leaves the top margin and the reserved bottom band free on a short canvas", (): void => {
    expect(getThreadMaxHeight(400)).toBe(400 - EDGE_MARGIN - BOTTOM_RESERVED);
  });
});
