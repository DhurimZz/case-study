import { describe, expect, it } from "vitest";
import {
  CommentsState,
  getCommentErrorKind,
  getCommentsNotice,
} from "./comments-status";

/** Connected, loaded, three threads, nothing open: nothing to say. */
const CALM: CommentsState = {
  isLoading: false,
  hasLoadError: false,
  connection: "connected",
  lastError: null,
  threadCount: 3,
  hasSelection: false,
};

describe("getCommentsNotice", (): void => {
  it("shows nothing when all is well", (): void => {
    expect(getCommentsNotice(CALM)).toBeNull();
  });

  it.each([
    {
      name: "load error (Liveblocks retries it)",
      change: { hasLoadError: true },
      tone: "warning",
      text: "Trying again",
    },
    {
      name: "connection failed",
      change: { connection: "failed" },
      tone: "error",
      text: "Can't reach",
    },
    {
      name: "failed post",
      change: { lastError: "post-thread" },
      tone: "error",
      text: "A comment could not be posted",
    },
    {
      name: "failed reply",
      change: { lastError: "post-reply" },
      tone: "error",
      text: "reply could not be posted",
    },
    {
      name: "failed change",
      change: { lastError: "save-change" },
      tone: "error",
      text: "could not be saved",
    },
    {
      name: "connection lost",
      change: { connection: "lost" },
      tone: "warning",
      text: "Reconnecting",
    },
    {
      name: "loading",
      change: { isLoading: true, threadCount: 0 },
      tone: "info",
      text: "Loading",
    },
    {
      name: "empty room",
      change: { threadCount: 0 },
      tone: "info",
      text: "No comments yet",
    },
  ] as const)(
    "shows a $tone notice for a $name",
    ({ change, tone, text }): void => {
      const notice = getCommentsNotice({ ...CALM, ...change });
      expect(notice?.tone).toBe(tone);
      expect(notice?.message).toContain(text);
    }
  );

  describe("priority: only the most important state shows", (): void => {
    it.each([
      {
        name: "connection failed beats everything",
        state: {
          hasLoadError: true,
          connection: "failed",
          lastError: "post-thread",
          isLoading: true,
        },
        text: "Can't reach",
      },
      {
        name: "connection failed beats a failed save",
        state: { connection: "failed", lastError: "save-change" },
        text: "Can't reach",
      },
      {
        name: "a failed save beats connection lost",
        state: { connection: "lost", lastError: "post-reply" },
        text: "reply could not be posted",
      },
      {
        // Smoke test finding: going offline mid-load showed "could not be
        // loaded" instead of the cause.
        name: "connection lost beats a failed load",
        state: { connection: "lost", hasLoadError: true },
        text: "Reconnecting",
      },
      {
        name: "connection lost beats loading",
        state: { connection: "lost", isLoading: true },
        text: "Reconnecting",
      },
      {
        name: "a failed load beats the empty hint",
        state: { hasLoadError: true, threadCount: 0 },
        text: "Trying again",
      },
      {
        name: "loading beats the empty hint",
        state: { isLoading: true, threadCount: 0 },
        text: "Loading",
      },
    ] as const)("$name", ({ state, text }): void => {
      expect(getCommentsNotice({ ...CALM, ...state })?.message).toContain(text);
    });
  });

  it("hides the empty hint while a comment is being written", (): void => {
    expect(
      getCommentsNotice({ ...CALM, threadCount: 0, hasSelection: true })
    ).toBeNull();
  });

  it("lets the user dismiss save errors, but not states that end by themselves", (): void => {
    expect(
      getCommentsNotice({ ...CALM, lastError: "save-change" })?.isDismissible
    ).toBe(true);
    expect(
      getCommentsNotice({ ...CALM, connection: "lost" })?.isDismissible
    ).toBe(false);
  });

  it("never promises that offline comments sync later (they are not queued)", (): void => {
    const lost = getCommentsNotice({ ...CALM, connection: "lost" });
    expect(lost?.message).not.toContain("sync");
    expect(lost?.message).toContain("can't be saved");
  });

  it("only says to reload when Liveblocks has given up", (): void => {
    const retrying = getCommentsNotice({ ...CALM, hasLoadError: true });
    const gaveUp = getCommentsNotice({ ...CALM, connection: "failed" });
    expect(retrying?.message).not.toContain("reload");
    expect(gaveUp?.message).toContain("reload");
  });
});

describe("getCommentErrorKind", (): void => {
  it.each([
    { type: "CREATE_THREAD_ERROR", expected: "post-thread" },
    { type: "CREATE_COMMENT_ERROR", expected: "post-reply" },
    { type: "EDIT_COMMENT_ERROR", expected: "save-change" },
    { type: "ADD_REACTION_ERROR", expected: "save-change" },
    { type: "MARK_THREAD_AS_RESOLVED_ERROR", expected: "save-change" },
    { type: "ROOM_CONNECTION_ERROR", expected: null },
    { type: "LARGE_MESSAGE_ERROR", expected: null },
  ])("maps $type to $expected", ({ type, expected }): void => {
    expect(getCommentErrorKind(type)).toBe(expected);
  });
});
