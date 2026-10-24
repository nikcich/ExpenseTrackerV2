import { ReactNode } from "react";
import cx from "classnames";
import styles from "./RSU.module.scss";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export interface EntityColumn<T> {
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

export function EntityTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
  deleteDisabledReason,
  rowClassName,
  footer,
}: {
  columns: EntityColumn<T>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  deleteDisabledReason?: (row: T) => string | undefined;
  rowClassName?: (row: T) => string | undefined;
  footer?: ReactNode;
}) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={cx(c.align === "right" && styles.num)}>
                {c.header}
              </th>
            ))}
            {hasActions && <th className={styles.actionsCell}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={rowClassName?.(row)}>
              {columns.map((c) => (
                <td key={c.header} className={cx(c.align === "right" && styles.num)}>
                  {c.render(row)}
                </td>
              ))}
              {hasActions && (
                <td className={styles.actionsCell}>
                  {onEdit && (
                    <button className={styles.actionBtn} onClick={() => onEdit(row)}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <ConfirmDeleteButton
                      onConfirm={() => onDelete(row)}
                      disabledReason={deleteDisabledReason?.(row)}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
          {footer}
        </tbody>
      </table>
    </div>
  );
}
