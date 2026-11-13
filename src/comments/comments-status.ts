/**
 * "lost": Liveblocks has been reconnecting for longer than its
 * lostConnectionTimeout (5 s by default), so a short blip never counts.
 * "failed": the client gave up, for example when the auth endpoint refused.
 */
export type ConnectionState = "connected" | "lost" | "failed";
export type CommentErrorKind = "post-thread" | "post-reply" | "save-change";
export type NoticeTone = "info" | "warning" | "error";

/** Everything the comment layer knows about its async state, as plain values. */
export interface CommentsState {
  isLoading: boolean;
  hasLoadError: boolean;
  connection: ConnectionState;
  /** The last failed save, until the user dismisses it or saves again. */
  lastError: CommentErrorKind | null;
  threadCount: number;
  hasSelection: boolean;
}

export interface NoticeContent {
  tone: NoticeTone;
  message: string;
  isDismissible: boolean;
}

/** For the error boundary: the comment layer crashed and will not recover by itself. */
export const CRASHED_NOTICE: NoticeContent = {
  tone: "error",
  message:
    "Comments stopped working. You can still pan and zoom; reload the page to try again.",
  isDismissible: false,
};

const CONNECTION_FAILED_NOTICE: NoticeContent = {
  tone: "error",
  message:
    "Can't reach the comment server. You can still pan and zoom; reload the page to try again.",
  isDismissible: false,
};

const SAVE_ERROR_MESSAGES: Record<CommentErrorKind, string> = {
  // Only for a post whose thread is no longer open; an open one reopens its
  // composer with the text and says so inside the panel instead.
  "post-thread":
    "A comment could not be posted. Check your connection and try again.",
  "post-reply":
    "Your reply could not be posted. Check your connection and try again.",
  "save-change":
    "That change could not be saved. Check your connection and try again.",
};

// Comments are saved over HTTP and are not queued while offline: a post made
// now fails (and its text comes back), so this must not promise a later sync.
const CONNECTION_LOST_NOTICE: NoticeContent = {
  tone: "warning",
  message:
    "Connection lost. Reconnecting… New comments can't be saved until it is back.",
  isDismissible: false,
};

// Liveblocks keeps retrying a failed first load by itself (5 attempts, then
// again 5 s after it reports the error), so this never says "reload".
const LOAD_RETRY_NOTICE: NoticeContent = {
  tone: "warning",
  message: "Comments could not be loaded yet. Trying again…",
  isDismissible: false,
};

const LOADING_NOTICE: NoticeContent = {
  tone: "info",
  message: "Loading comments…",
  isDismissible: false,
};

const EMPTY_NOTICE: NoticeContent = {
  tone: "info",
  message: "No comments yet. Click anywhere on the image to add one.",
  isDismissible: false,
};

/**
 * The one message to show for the current state, or null. First match wins:
 * what waiting cannot fix, then what the user can act on, then the cause of
 * a problem before its effect (a lost connection explains a failed load),
 * then transient states, then the hint. Only one notice is ever shown, so
 * they never stack.
 */
export function getCommentsNotice(state: CommentsState): NoticeContent | null {
  if (state.connection === "failed") {
    return CONNECTION_FAILED_NOTICE;
  }
  if (state.lastError !== null) {
    return {
      tone: "error",
      message: SAVE_ERROR_MESSAGES[state.lastError],
      isDismissible: true,
    };
  }
  if (state.connection === "lost") {
    return CONNECTION_LOST_NOTICE;
  }
  if (state.hasLoadError) {
    return LOAD_RETRY_NOTICE;
  }
  if (state.isLoading) {
    return LOADING_NOTICE;
  }
  const isEmptyRoom = state.threadCount === 0 && !state.hasSelection;
  if (isEmptyRoom) {
    return EMPTY_NOTICE;
  }
  return null;
}

// Liveblocks error context types (LiveblocksErrorContext in @liveblocks/core)
// that belong to comments. Connection errors are reported through the
// connection state instead, and inbox notifications are not used here.
const ERROR_KINDS: Readonly<Record<string, CommentErrorKind | undefined>> = {
  CREATE_THREAD_ERROR: "post-thread",
  CREATE_COMMENT_ERROR: "post-reply",
  EDIT_COMMENT_ERROR: "save-change",
  DELETE_COMMENT_ERROR: "save-change",
  DELETE_THREAD_ERROR: "save-change",
  EDIT_THREAD_METADATA_ERROR: "save-change",
  EDIT_COMMENT_METADATA_ERROR: "save-change",
  MARK_THREAD_AS_RESOLVED_ERROR: "save-change",
  MARK_THREAD_AS_UNRESOLVED_ERROR: "save-change",
  SUBSCRIBE_TO_THREAD_ERROR: "save-change",
  UNSUBSCRIBE_FROM_THREAD_ERROR: "save-change",
  ADD_REACTION_ERROR: "save-change",
  REMOVE_REACTION_ERROR: "save-change",
};

export function getCommentErrorKind(
  contextType: string
): CommentErrorKind | null {
  return ERROR_KINDS[contextType] ?? null;
}
