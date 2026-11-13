import { ReactElement } from "react";
import styles from "./canvas.module.css";

export function ImageLoading(): ReactElement {
  return (
    <div className={styles.statusLayer}>
      <div className={styles.statusCard} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.statusText}>Loading image…</p>
      </div>
    </div>
  );
}
