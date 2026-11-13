import { describe, expect, it } from "vitest";
import {
  BOTTOM_RESERVED,
  EDGE_MARGIN,
  PIN_SIZE,
  THREAD_GAP,
  THREAD_MAX_HEIGHT,
  THREAD_WIDTH,
  getPanelStyle,
  getSheetMaxHeight,
  getThreadLeft,
  getThreadMaxHeight,
  getThreadPlacement,
  getThreadTop,
} from "./comment-layout";

const CANVAS_WIDTH = 1280;
/** Pin plus gap plus thread: 360 px to the right of the pin's anchor. */
const NEEDED_ON_RIGHT = PIN_SIZE + THREAD_GAP + THREAD_WIDTH;
/** The last pin x where a right-side thread still fits. */
const LAST_X_FOR_RIGHT = CANVAS_WIDTH - EDGE_MARGIN - NEEDED_ON_RIGHT;

describe("getThreadPlacement", (): void => {
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
    expect(getThreadPlacement({ x, y: 200 }, CANVAS_WIDTH)).toBe(expected);
  });

  it("does not depend on the pin's height on screen", (): void => {
    expect(getThreadPlacement({ x: 1100, y: -500 }, CANVAS_WIDTH)).toBe("left");
    expect(getThreadPlacement({ x: 1100, y: 5000 }, CANVAS_WIDTH)).toBe("left");
  });

  describe("when neither side fits", (): void => {
    it.each([
      { name: "a 375 px phone, pin on the left", width: 375, x: 100 },
      { name: "a 375 px phone, pin on the right", width: 375, x: 250 },
      { name: "a 320 px phone, anywhere", width: 320, x: 160 },
      { name: "a 600 px canvas, pin in the middle", width: 600, x: 300 },
    ])("opens a bottom sheet on $name", ({ width, x }): void => {
      expect(getThreadPlacement({ x, y: 200 }, width)).toBe("sheet");
    });

    it("still opens beside the pin on a 768 px tablet when one side fits", (): void => {
      expect(getThreadPlacement({ x: 384, y: 200 }, 768)).toBe("right");
      expect(getThreadPlacement({ x: 700, y: 200 }, 768)).toBe("left");
    });
  });
});

describe("getPanelStyle", (): void => {
  const pin = { x: 900, y: 200 };

  it("anchors a sheet to the bottom, full width minus the margins, above the zoom controls", (): void => {
    expect(
      getPanelStyle(
        "sheet",
        { x: 100, y: 300 },
        { width: 375, height: 740 },
        94
      )
    ).toEqual({
      top: "auto",
      left: EDGE_MARGIN,
      right: EDGE_MARGIN,
      bottom: BOTTOM_RESERVED,
      maxHeight: 407,
    });
  });

  it("places a right-side panel after the pin and the gap, at the pin's height", (): void => {
    expect(
      getPanelStyle("right", pin, { width: 1280, height: 800 }, null)
    ).toEqual({
      width: THREAD_WIDTH,
      maxHeight: THREAD_MAX_HEIGHT,
      transform: `translate(${900 + PIN_SIZE + THREAD_GAP}px, 200px)`,
    });
  });

  it("places a left-side panel so it ends one gap before the pin", (): void => {
    expect(
      getPanelStyle("left", pin, { width: 1280, height: 800 }, null).transform
    ).toBe(`translate(${900 - THREAD_GAP - THREAD_WIDTH}px, 200px)`);
  });
});

describe("getSheetMaxHeight", (): void => {
  it("is 55% of a phone's canvas height", (): void => {
    expect(getSheetMaxHeight(740)).toBe(407);
  });

  it("never exceeds the thread's max height", (): void => {
    expect(getSheetMaxHeight(2000)).toBe(THREAD_MAX_HEIGHT);
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

  it("keeps a left thread inside the canvas whenever the placement is left", (): void => {
    const pinNearEdge = { x: LAST_X_FOR_RIGHT + 1, y: 200 };
    expect(getThreadPlacement(pinNearEdge, CANVAS_WIDTH)).toBe("left");
    expect(getThreadLeft(pinNearEdge, "left")).toBeGreaterThanOrEqual(
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
