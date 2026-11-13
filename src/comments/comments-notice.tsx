import { ReactElement } from "react";
import { NoticeContent } from "./comments-status";
import styles from "./comments.module.css";

export interface CommentsNoticeProps {
  notice: NoticeContent | null;
  /** Shown as a close button only when the notice is dismissible. */
  onDismiss?: () => void;
}

/**
 * Always renders both live regions, even empty: screen readers announce a
 * change inside an existing region, but often miss a region that appears
 * together with its text. Errors and warnings interrupt (alert); loading and
 * hints wait (status).
 */
export function CommentsNotice({
  notice,
  onDismiss,
}: CommentsNoticeProps): ReactElement {
  const isInfo = notice?.tone === "info";
  const canDismiss = notice?.isDismissible === true && onDismiss !== undefined;

  const pill = notice ? (
    <div className={styles.notice} data-tone={notice.tone}>
      <span className={styles.noticeDot} aria-hidden="true" />
      <p className={styles.noticeText}>{notice.message}</p>
      {canDismiss ? (
        <button
          type="button"
          className={styles.noticeDismiss}
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <svg
            className={styles.noticeDismissIcon}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <div role="status">{isInfo ? pill : null}</div>
      <div role="alert">{isInfo ? null : pill}</div>
    </>
  );
}
