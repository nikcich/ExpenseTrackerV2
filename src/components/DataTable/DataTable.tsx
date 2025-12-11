import { Button, Checkbox, Input, Table } from "@chakra-ui/react";
import { memo, useCallback, useMemo, useState } from "react";
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
      <Input
        type="search"
        onChange={(e) => debouncedSearchString(e.target.value)}
        placeholder="Search..."
        style={{
          width: "99%",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "black",
        }}
      />

      <CoreTable items={filteredItems} />
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
    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (sortColumn === "tags" && Array.isArray(aVal) && Array.isArray(bVal)) {
        return sortDirection === "asc"
          ? aVal.length - bVal.length
          : bVal.length - aVal.length;
      }

      if (
        sortColumn === "date" &&
        typeof aVal === "string" &&
        typeof bVal === "string"
      ) {
        return compareDates(aVal, bVal, sortDirection);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [items, sortColumn, sortDirection]);

  const rows = useMemo(() => {
    return sortedItems.map((item) => (
      <Table.Row
        key={item.id}
        data-selected={selection.includes(item.id) ? "" : undefined}
        onDoubleClick={() => {
          setSelection([item.id]);
          enableOverlay(Overlay.EditModal);
        }}
      >
        <Table.Cell>
          <Checkbox.Root
            size="sm"
            mt="0.5"
            aria-label="Select row"
            checked={selection.includes(item.id)}
            onCheckedChange={(changes) => {
              setSelection((prev) =>
                changes.checked
                  ? [...prev, item.id]
                  : selection.filter((name) => name !== item.id)
              );
            }}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
        </Table.Cell>
        <Table.Cell>
          <TagCell tags={item.tags} />
        </Table.Cell>

        <Table.Cell>{format(new Date(item.date), "MM-dd-yyyy")}</Table.Cell>
        <Table.Cell>{item.description}</Table.Cell>
        <Table.Cell>
          <span className={item.amount < 0 ? styles.income : styles.expense}>
            ${item.amount.toFixed(2)}
          </span>
        </Table.Cell>
      </Table.Row>
    ));
  }, [sortedItems, selection]);

  return (
    <Table.Root variant={"line"} striped stickyHeader>
      <Table.Header
        style={{
          position: "sticky",
          top: "40px",
          zIndex: 100,
          background: "black",
        }}
      >
        <Table.Row>
          <Table.ColumnHeader w="6">
            <Checkbox.Root
              size="sm"
              mt="0.5"
              aria-label="Select all rows"
              checked={indeterminate ? "indeterminate" : selection.length > 0}
              onCheckedChange={(changes) => {
                setSelection(
                  changes.checked ? items.map((item) => item.id) : []
                );
              }}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
            </Checkbox.Root>
          </Table.ColumnHeader>

          <Table.ColumnHeader onClick={() => handleSort("tags")}>
            <span className={styles.header}>
              Tags
              {sortColumn === "tags" &&
                (sortDirection === "asc" ? (
                  <FaChevronUp size={14} />
                ) : (
                  <FaChevronDown size={14} />
                ))}
            </span>
          </Table.ColumnHeader>

          <Table.ColumnHeader
            onClick={() => handleSort("date")}
            cursor="pointer"
          >
            <span className={styles.header}>
              Date
              {sortColumn === "date" &&
                (sortDirection === "asc" ? (
                  <FaChevronUp size={14} />
                ) : (
                  <FaChevronDown size={14} />
                ))}
            </span>
          </Table.ColumnHeader>

          <Table.ColumnHeader
            onClick={() => handleSort("description")}
            cursor="pointer"
          >
            <span className={styles.header}>
              Description
              {sortColumn === "description" &&
                (sortDirection === "asc" ? (
                  <FaChevronUp size={14} />
                ) : (
                  <FaChevronDown size={14} />
                ))}
            </span>
          </Table.ColumnHeader>

          <Table.ColumnHeader
            onClick={() => handleSort("amount")}
            cursor="pointer"
          >
            <span className={styles.header}>
              Amount
              {sortColumn === "amount" &&
                (sortDirection === "asc" ? (
                  <FaChevronUp size={14} />
                ) : (
                  <FaChevronDown size={14} />
                ))}
            </span>
          </Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>{rows}</Table.Body>
    </Table.Root>
  );
});
