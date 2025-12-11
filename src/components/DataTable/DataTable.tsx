import { Button, Input } from "@chakra-ui/react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { API, Expense, NonExpenseTags, Response, Tag } from "@/types/types";
import { BrushScrubber } from "../Brush/BrushScrubber";
import { GenericPage } from "../GenericPage/GenericPage";
import { Tag as TagComp } from "@chakra-ui/react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronUp } from "react-icons/fa";
import styles from "./DataTable.module.scss";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { invoke } from "@tauri-apps/api/core";
import { debounce } from "lodash";
import { format } from "date-fns";

const TagCell = ({ tags }: { tags: Tag[] }) => {
  return (
    <div>
      {tags.map((tag) => (
        <TagComp.Root
          key={tag}
          colorPalette={
            tag === NonExpenseTags.Income
              ? "green"
              : tag === NonExpenseTags.Savings
                ? "yellow"
                : "red"
          }
        >
          <TagComp.Label>{tag}</TagComp.Label>
        </TagComp.Root>
      ))}
    </div>
  );
};

type SortKey = keyof Expense;
type SortDirection = "asc" | "desc";

const compareDates = (
  date1: string,
  date2: string,
  order: SortDirection
): number => {
  const date1Obj = new Date(date1);
  const date2Obj = new Date(date2);

  if (order === "asc") {
    return date1Obj < date2Obj ? -1 : 1;
  } else {
    return date1Obj > date2Obj ? -1 : 1;
  }
};

export const DataTable = ({ items }: { items: Expense[] }) => {
  const selection = useSelection();
  const [searchString, setSearchString] = useState<string>("");

  const handleDeleteSelection = useCallback(async (selection: string[]) => {
    for (const id of selection) {
      await invoke<Response<string>>(API.RemoveExpense, {
        hash: id,
      });
    }
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.description.toLowerCase().includes(searchString.toLowerCase())
    );
  }, [items, searchString]);

  const debouncedSearchString = useMemo(() => {
    return debounce(setSearchString, 300);
  }, [searchString]);

  return (
    <GenericPage
      title={`Expenses (${items.length})`}
      actions={
        <>
          <Button
            size={"xs"}
            colorPalette={"green"}
            onClick={() => enableOverlay(Overlay.ManualModal)}
          >
            Add Expense
          </Button>
          {selection.length > 0 && (
            <>
              <Button
                size={"xs"}
                colorPalette={"orange"}
                onClick={() => {
                  if (selection.length > 0) {
                    enableOverlay(Overlay.TagModal);
                  }
                }}
              >
                Tag Selection
              </Button>

              <Button
                size={"xs"}
                colorPalette={"blue"}
                onClick={() => {
                  if (selection.length > 0) {
                    enableOverlay(Overlay.EditModal);
                  }
                }}
              >
                Modify Selection
              </Button>

              <Button
                size={"xs"}
                colorPalette={"red"}
                onClick={() => handleDeleteSelection(selection)}
              >
                Delete Selection
              </Button>
            </>
          )}
        </>
      }
      footer={<BrushScrubber />}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Input
          type="search"
          onChange={(e) => debouncedSearchString(e.target.value)}
          placeholder="Search..."
          style={{
            width: "97%",
            zIndex: 100,
            background: "black",
            minHeight: "40px",
          }}
        />

        <div
          style={{
            width: "100%",
            overflow: "hidden",
            flexGrow: 1,
          }}
        >
          <CoreTable items={filteredItems} />
        </div>
      </div>
    </GenericPage>
  );
};

const CoreTable = memo(({ items }: { items: Expense[] }) => {
  const selection = useSelection();
  const [sortColumn, setSortColumn] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortKey) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const indeterminate = selection.length > 0 && selection.length < items.length;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (sortColumn === "tags") {
        return sortDirection === "asc"
          ? (aVal as any[]).length - (bVal as any[]).length
          : (bVal as any[]).length - (aVal as any[]).length;
      }

      if (sortColumn === "date") {
        return compareDates(aVal as string, bVal as string, sortDirection);
      }

      if (typeof aVal === "number") {
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }

      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, sortColumn, sortDirection]);

  return (
    <div
      style={{ height: "100%", overflow: "auto" }}
      className={styles.virtualizedTable}
    >
      <table>
        <thead>
          <tr>
            <th
              onClick={(e) => e.stopPropagation()}
              className={styles.leftCenterContent}
            >
              <input
                type="checkbox"
                checked={selection.length === items.length}
                ref={(el) => {
                  if (el) el.indeterminate = indeterminate;
                }}
                onChange={(e) =>
                  setSelection(e.target.checked ? items.map((i) => i.id) : [])
                }
              />
            </th>

            <th
              onClick={() => handleSort("tags")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Tags{" "}
                {sortColumn === "tags" &&
                  (sortDirection === "asc" ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  ))}
              </span>
            </th>

            <th
              onClick={() => handleSort("date")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Date{" "}
                {sortColumn === "date" &&
                  (sortDirection === "asc" ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  ))}
              </span>
            </th>

            <th
              onClick={() => handleSort("description")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Description{" "}
                {sortColumn === "description" &&
                  (sortDirection === "asc" ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  ))}
              </span>
            </th>

            <th
              onClick={() => handleSort("amount")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Amount{" "}
                {sortColumn === "amount" &&
                  (sortDirection === "asc" ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  ))}
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedItems.map((item) => {
            return (
              <tr
                key={item.id}
                data-selected={selection.includes(item.id) ? "" : undefined}
                onDoubleClick={() => {
                  setSelection([item.id]);
                  enableOverlay(Overlay.EditModal);
                }}
              >
                <td className={styles.leftCenterContent}>
                  <input
                    type="checkbox"
                    checked={selection.includes(item.id)}
                    onChange={(e) =>
                      setSelection((prev) =>
                        e.target.checked
                          ? [...prev, item.id]
                          : prev.filter((x) => x !== item.id)
                      )
                    }
                  />
                </td>

                <td className={styles.leftCenterContent}>
                  <TagCell tags={item.tags} />
                </td>

                <td className={styles.leftCenterContent}>
                  {format(new Date(item.date), "MM-dd-yyyy")}
                </td>

                <td className={styles.leftCenterContent}>{item.description}</td>

                <td className={styles.leftCenterContent}>
                  <span
                    className={item.amount < 0 ? styles.income : styles.expense}
                  >
                    ${item.amount.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
