"use client";

import { ReactElement, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CommentLayer, CommentSelection } from "./comment-layer";
import { CommentsNotice } from "./comments-notice";
import { CRASHED_NOTICE } from "./comments-status";
import { Point } from "@/canvas/canvas-math";
import { CanvasOverlayState, ImageCanvas } from "@/canvas/image-canvas";

export interface ImageCommentsProps {
  src: string;
  alt: string;
}

function handleCommentsError(error: Error): void {
  console.error("The comment layer crashed", error);
}

export function ImageComments({ src, alt }: ImageCommentsProps): ReactElement {
  // Lives here, outside the comment layer, because the canvas click
  // handlers below need it too.
  const [selection, setSelection] = useState<CommentSelection>(null);

  function handleImageClick(anchor: Point): void {
    // Like clicking outside any popover: a click while a thread or the
    // composer is open only closes it. The next click starts a comment.
    if (selection !== null) {
      setSelection(null);
      return;
    }
    setSelection({ kind: "draft", anchor });
  }

  function handleBackgroundClick(): void {
    setSelection(null);
  }

  // Loading, connection and save errors are shown by the layer itself. The
  // boundary only catches a crash, and keeps the image working (pan, zoom)
  // when it happens.
  function renderCommentLayer(overlay: CanvasOverlayState): ReactElement {
    return (
      <ErrorBoundary
        fallback={<CommentsNotice notice={CRASHED_NOTICE} />}
        onError={handleCommentsError}
      >
        <CommentLayer
          overlay={overlay}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ImageCanvas
      src={src}
      alt={alt}
      onImageClick={handleImageClick}
      onBackgroundClick={handleBackgroundClick}
      renderOverlay={renderCommentLayer}
    />
  );
}
