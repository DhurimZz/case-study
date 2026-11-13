import { CommentBody } from "@liveblocks/client";
import {
  useCreateThread,
  useErrorListener,
  useSelf,
  useThreads,
} from "@liveblocks/react";
import { Composer, ComposerSubmitComment, Thread } from "@liveblocks/react-ui";
import {
  Dispatch,
  FormEvent,
  Fragment,
  ReactElement,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnchoredPin } from "./anchored-pin";
import { CommentPanel } from "./comment-panel";
import { CommentsNotice } from "./comments-notice";
import {
  CommentErrorKind,
  getCommentErrorKind,
  getCommentsNotice,
} from "./comments-status";
import styles from "./comments.module.css";
import { useConnectionState } from "./use-connection-state";
import {
  Point,
  getScreenPointFromNormalized,
  isNormalizedPoint,
} from "@/canvas/canvas-math";
import { CanvasOverlayState } from "@/canvas/image-canvas";

/** At most one thing is open: a new comment at an anchor, or one existing thread. */
export type CommentSelection =
  | {
      kind: "draft";
      anchor: Point;
      /** Set when a post failed: its text, put back into the composer. */
      body?: CommentBody;
      hasFailedToPost?: boolean;
    }
  | { kind: "thread"; threadId: string }
  | null;

/** The last comment this user posted, kept until they move on from its thread. */
interface PostedComment {
  threadId: string;
  anchor: Point;
  body: CommentBody;
}

export interface CommentLayerProps {
  overlay: CanvasOverlayState;
  selection: CommentSelection;
  /** A state setter, so updates can depend on the latest selection. */
  onSelectionChange: Dispatch<SetStateAction<CommentSelection>>;
}

const DRAFT_PANEL_ID = "comment-panel-draft";

function getThreadPanelId(threadId: string): string {
  return `comment-panel-${threadId}`;
}

function getThreadLabel(commentCount: number, isResolved: boolean): string {
  const noun = commentCount === 1 ? "comment" : "comments";
  const status = isResolved ? ", resolved" : "";
  return `Comment thread, ${commentCount} ${noun}${status}`;
}

// The non-suspense Liveblocks hooks: loading and errors come back as values,
// so this layer can show them instead of suspending or throwing.
export function CommentLayer({
  overlay,
  selection,
  onSelectionChange,
}: CommentLayerProps): ReactElement {
  const threadsResult = useThreads();
  const createThread = useCreateThread();
  const currentUserId = useSelf((me): string => me.id);
  const connection = useConnectionState();
  const [lastError, setLastError] = useState<CommentErrorKind | null>(null);
  const { focusCanvas } = overlay;
  // Pin buttons by thread id, to give focus back to the pin when its thread
  // closes with Escape.
  const pinRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastVisibleThreadIdRef = useRef<string | null>(null);
  const lastPostRef = useRef<PostedComment | null>(null);

  const threads = threadsResult.threads ?? [];
  // Liveblocks does not validate metadata at runtime: a thread written by
  // another client could hold anything. It must not crash or float off the
  // image, so threads without a valid anchor are not drawn.
  const anchoredThreads = threads.filter((thread): boolean =>
    isNormalizedPoint(thread.metadata)
  );
  const openThreadId = selection?.kind === "thread" ? selection.threadId : null;
  const draft = selection?.kind === "draft" ? selection : null;
  const isOpenThreadVisible = anchoredThreads.some(
    (thread): boolean => thread.id === openThreadId
  );

  const notice = getCommentsNotice({
    isLoading: threadsResult.isLoading,
    hasLoadError: threadsResult.error !== undefined,
    connection,
    lastError,
    threadCount: anchoredThreads.length,
    hasSelection: selection !== null,
  });

  useErrorListener((error): void => {
    const kind = getCommentErrorKind(error.context.type);
    if (kind === null) {
      return;
    }
    // A post whose thread is still open is handled where it vanishes (the
    // effect below), which also covers network failures: for those
    // Liveblocks rolls the thread back without emitting any error.
    const isOpenPostFailure =
      error.context.type === "CREATE_THREAD_ERROR" &&
      error.context.threadId === openThreadId;
    if (!isOpenPostFailure) {
      setLastError(kind);
    }
  });

  // The open thread can vanish while open. If it is the comment this user
  // just posted, the post failed and was rolled back: reopen the composer at
  // the same spot with the same text. Otherwise someone else deleted it:
  // close it, or the next click would only clear an invisible selection.
  // A thread that has not been visible yet is left alone.
  useEffect((): void => {
    if (lastPostRef.current?.threadId !== openThreadId) {
      lastPostRef.current = null;
    }
    if (openThreadId === null) {
      return;
    }
    if (isOpenThreadVisible) {
      lastVisibleThreadIdRef.current = openThreadId;
      return;
    }
    if (lastVisibleThreadIdRef.current !== openThreadId) {
      return;
    }

    const failedPost = lastPostRef.current;
    lastPostRef.current = null;
    // Functional update: only acts if that thread is still what is open.
    onSelectionChange((current): CommentSelection => {
      const isStillOpen =
        current?.kind === "thread" && current.threadId === openThreadId;
      if (!isStillOpen) {
        return current;
      }
      if (failedPost === null) {
        return null;
      }
      return {
        kind: "draft",
        anchor: failedPost.anchor,
        body: failedPost.body,
        hasFailedToPost: true,
      };
    });
  }, [openThreadId, isOpenThreadVisible, onSelectionChange]);

  // On the document, not the panel: dragging the canvas moves focus out of
  // the panel, and Escape should still close it. Re-subscribes only when the
  // selection changes, not on every pan frame.
  useEffect((): (() => void) | undefined => {
    if (selection === null) {
      return;
    }
    const closingThreadId =
      selection.kind === "thread" ? selection.threadId : null;

    function handleKeyDown(event: KeyboardEvent): void {
      // Liveblocks marks Escape as handled when it closes its own mention
      // list or formatting toolbar first.
      const isUnhandledEscape =
        event.key === "Escape" && !event.defaultPrevented;
      if (!isUnhandledEscape) {
        return;
      }
      onSelectionChange(null);
      const pin = closingThreadId ? pinRefs.current.get(closingThreadId) : null;
      if (pin) {
        pin.focus();
      } else {
        focusCanvas();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selection, onSelectionChange, focusCanvas]);

  function getPinPoint(anchor: Point): Point {
    return getScreenPointFromNormalized(
      anchor,
      overlay.imageSize,
      overlay.transform
    );
  }

  function updatePinRef(
    threadId: string,
    element: HTMLButtonElement | null
  ): void {
    if (element) {
      pinRefs.current.set(threadId, element);
    } else {
      pinRefs.current.delete(threadId);
    }
  }

  function handlePinClick(threadId: string): void {
    const isAlreadyOpen = openThreadId === threadId;
    onSelectionChange(isAlreadyOpen ? null : { kind: "thread", threadId });
  }

  // For a draft or a deleted thread there is no pin left to take focus.
  function handleCloseToCanvas(): void {
    onSelectionChange(null);
    focusCanvas();
  }

  // The dismiss button disappears with the notice; keep keyboard focus nearby.
  function handleNoticeDismiss(): void {
    setLastError(null);
    focusCanvas();
  }

  function handleDraftSubmit(
    comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ): void {
    if (draft === null) {
      return;
    }
    // Created here instead of by the Composer, to get the new thread's id
    // and show it open right after posting.
    event.preventDefault();
    setLastError(null);
    const thread = createThread({
      body: comment.body,
      attachments: comment.attachments,
      metadata: draft.anchor,
    });
    lastPostRef.current = {
      threadId: thread.id,
      anchor: draft.anchor,
      body: comment.body,
    };
    onSelectionChange({ kind: "thread", threadId: thread.id });
  }

  const draftPinPoint = draft ? getPinPoint(draft.anchor) : null;

  // Each panel comes right after its pin, so Tab moves from a pin into its
  // thread. The panel's z-index keeps it above the pins that follow.
  return (
    <div className={styles.layer}>
      {anchoredThreads.map((thread): ReactElement => {
        const isOpen = thread.id === openThreadId;
        const pinPoint = getPinPoint(thread.metadata);
        const panelId = getThreadPanelId(thread.id);

        return (
          <Fragment key={thread.id}>
            <AnchoredPin
              screenPoint={pinPoint}
              userId={thread.comments[0]?.userId}
              label={getThreadLabel(thread.comments.length, thread.resolved)}
              isOpen={isOpen}
              isResolved={thread.resolved}
              panelId={isOpen ? panelId : undefined}
              onClick={(): void => handlePinClick(thread.id)}
              buttonRef={(element): void => updatePinRef(thread.id, element)}
            />
            {isOpen ? (
              <CommentPanel
                id={panelId}
                pinPoint={pinPoint}
                canvasSize={overlay.viewportSize}
                label="Comment thread"
              >
                <Thread
                  thread={thread}
                  autoFocus
                  onThreadDelete={handleCloseToCanvas}
                />
              </CommentPanel>
            ) : null}
          </Fragment>
        );
      })}

      {draft && draftPinPoint ? (
        <>
          <AnchoredPin
            screenPoint={draftPinPoint}
            userId={currentUserId ?? undefined}
            label="New comment, click to discard"
            isOpen
            panelId={DRAFT_PANEL_ID}
            onClick={handleCloseToCanvas}
          />
          <CommentPanel
            id={DRAFT_PANEL_ID}
            pinPoint={draftPinPoint}
            canvasSize={overlay.viewportSize}
            label="New comment"
          >
            {draft.hasFailedToPost ? (
              <p className={styles.panelError} role="alert">
                This comment could not be posted. Check your connection and send
                it again.
              </p>
            ) : null}
            <Composer
              autoFocus
              defaultValue={draft.body}
              onComposerSubmit={handleDraftSubmit}
            />
          </CommentPanel>
        </>
      ) : null}

      <CommentsNotice notice={notice} onDismiss={handleNoticeDismiss} />
    </div>
  );
}
