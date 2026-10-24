import { useEffect, useState } from "react";
import cx from "classnames";
import styles from "./RSU.module.scss";

export function ConfirmDeleteButton({
  onConfirm,
  disabledReason,
}: {
  onConfirm: () => void;
  disabledReason?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (disabledReason) {
    return (
      <button
        className={cx(styles.actionBtn, styles.deleteBtn)}
        disabled
        title={disabledReason}
      >
        Delete
      </button>
    );
  }

  return (
    <button
      className={cx(styles.actionBtn, styles.deleteBtn, confirming && styles.deleteBtnConfirming)}
      onClick={() => {
        if (confirming) {
          setConfirming(false);
          onConfirm();
        } else {
          setConfirming(true);
        }
      }}
    >
      {confirming ? "Confirm?" : "Delete"}
    </button>
  );
}
