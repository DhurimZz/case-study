import { Composer, ComposerSubmitComment, Thread } from "@liveblocks/react-ui";
import {
  useCreateThread,
  useSelf,
  useThreads,
} from "@liveblocks/react/suspense";
import { FormEvent, Fragment, ReactElement, useEffect, useRef } from "react";
import { AnchoredPin } from "./anchored-pin";
import { CommentPanel } from "./comment-panel";
import styles from "./comments.module.css";
import {
  Point,
  getScreenPointFromNormalized,
  isNormalizedPoint,
} from "@/canvas/canvas-math";
import { CanvasOverlayState } from "@/canvas/image-canvas";

/** At most one thing is open: a new comment at an anchor, or one existing thread. */
export type CommentSelection =
  | { kind: "draft"; anchor: Point }
  | { kind: "thread"; threadId: string }
  | null;

export interface CommentLayerProps {
  overlay: CanvasOverlayState;
  selection: CommentSelection;
  onSelectionChange: (selection: CommentSelection) => void;
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

export function CommentLayer({
  overlay,
  selection,
  onSelectionChange,
}: CommentLayerProps): ReactElement {
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const currentUserId = useSelf((me): string => me.id);
  const { focusCanvas } = overlay;
  // Pin buttons by thread id, to give focus back to the pin when its thread
  // closes with Escape.
  const pinRefs = useRef(new Map<string, HTMLButtonElement>());

  // Liveblocks does not validate metadata at runtime: a thread written by
  // another client could hold anything. It must not crash or float off the
  // image, so threads without a valid anchor are not drawn.
  const anchoredThreads = threads.filter((thread): boolean =>
    isNormalizedPoint(thread.metadata)
  );
  const openThreadId = selection?.kind === "thread" ? selection.threadId : null;
  const draftAnchor = selection?.kind === "draft" ? selection.anchor : null;

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

  function handleDraftSubmit(
    comment: ComposerSubmitComment,
    event: FormEvent<HTMLFormElement>
  ): void {
    if (selection?.kind !== "draft") {
      return;
    }
    // Created here instead of by the Composer, to get the new thread's id
    // and show it open right after posting.
    event.preventDefault();
    const thread = createThread({
      body: comment.body,
      attachments: comment.attachments,
      metadata: selection.anchor,
    });
    onSelectionChange({ kind: "thread", threadId: thread.id });
  }

  const draftPinPoint = draftAnchor ? getPinPoint(draftAnchor) : null;

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

      {draftPinPoint ? (
        <>
          <AnchoredPin
            screenPoint={draftPinPoint}
            userId={currentUserId}
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
            <Composer autoFocus onComposerSubmit={handleDraftSubmit} />
          </CommentPanel>
        </>
      ) : null}
    </div>
  );
}
