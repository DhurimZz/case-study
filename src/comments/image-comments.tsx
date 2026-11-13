"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import { ReactElement, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CommentLayer, CommentSelection } from "./comment-layer";
import styles from "./comments.module.css";
import { Point } from "@/canvas/canvas-math";
import { CanvasOverlayState, ImageCanvas } from "@/canvas/image-canvas";

export interface ImageCommentsProps {
  src: string;
  alt: string;
}

function handleCommentsError(error: Error): void {
  console.error("Comments could not be loaded", error);
}

export function ImageComments({ src, alt }: ImageCommentsProps): ReactElement {
  // Lives here, outside the Liveblocks Suspense boundary, because the canvas
  // click handlers below need it too.
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

  // The image keeps working (pan, zoom) while comments load or if they fail:
  // the boundaries wrap only the comment layer.
  function renderCommentLayer(overlay: CanvasOverlayState): ReactElement {
    return (
      <ErrorBoundary
        fallback={
          <p className={styles.layerError} role="alert">
            Comments could not be loaded. You can still pan and zoom; reload the
            page to try again.
          </p>
        }
        onError={handleCommentsError}
      >
        <ClientSideSuspense fallback={null}>
          <CommentLayer
            overlay={overlay}
            selection={selection}
            onSelectionChange={setSelection}
          />
        </ClientSideSuspense>
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
