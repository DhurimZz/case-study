import { ReactElement } from "react";
import styles from "./canvas.module.css";

export interface ZoomControlsProps {
  scale: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}

// aria-disabled instead of disabled: a disabled button drops keyboard focus
// the moment the zoom limit is reached. Clicking it at the limit is a no-op
// because the scale is clamped.
export function ZoomControls({
  scale,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
}: ZoomControlsProps): ReactElement {
  const zoomPercent = Math.round(scale * 100);

  return (
    <div className={styles.zoomControls} role="group" aria-label="Zoom">
      <button
        type="button"
        className={styles.controlButton}
        onClick={onZoomOut}
        aria-disabled={!canZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>

      <output className={styles.zoomLevel} aria-label="Zoom level">
        {zoomPercent}%
      </output>

      <button
        type="button"
        className={styles.controlButton}
        onClick={onZoomIn}
        aria-disabled={!canZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <span className={styles.divider} aria-hidden="true" />

      <button
        type="button"
        className={styles.controlButton}
        onClick={onFitToScreen}
        aria-label="Fit to screen"
        title="Fit to screen"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </div>
  );
}
