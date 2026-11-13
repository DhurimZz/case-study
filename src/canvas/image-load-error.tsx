import { ReactElement } from "react";
import styles from "./canvas.module.css";

export interface ImageLoadErrorProps {
  onRetry: () => void;
}

export function ImageLoadError({ onRetry }: ImageLoadErrorProps): ReactElement {
  return (
    <div className={styles.statusLayer}>
      <div className={styles.statusCard} role="alert">
        <p className={styles.statusTitle}>The image could not be loaded</p>
        <p className={styles.statusText}>
          Check your connection, then try again.
        </p>
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
