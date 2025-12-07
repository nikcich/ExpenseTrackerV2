import { Button, Checkbox, Table } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { Expense, NonExpenseTags, Tag } from "@/types/types";
import { BrushScrubber } from "../Brush/BrushScrubber";
import { GenericPage } from "../GenericPage/GenericPage";
import { Tag as TagComp } from "@chakra-ui/react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronUp } from "react-icons/fa";
import styles from "./DataTable.module.scss";
const TagCell = ({ tags }: { tags: Tag[] }) => {
  return (
    <div>
      {tags.map((tag) => (
        <TagComp.Root
          key={tag}
          colorPalette={tag === NonExpenseTags.Income ? "green" : "red"}
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
  const [selection, setSelection] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const indeterminate = selection.length > 0 && selection.length < items.length;

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

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

  const handleSort = (column: SortKey) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const rows = sortedItems.map((item) => (
    <Table.Row
      key={item.id}
      data-selected={selection.includes(item.id) ? "" : undefined}
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

      <Table.Cell>{item.date}</Table.Cell>
      <Table.Cell>{item.description}</Table.Cell>
      <Table.Cell>
        <span className={item.amount < 0 ? styles.income : styles.expense}>
          ${item.amount}
        </span>
      </Table.Cell>
    </Table.Row>
  ));

  return (
    <GenericPage
      title={`Expenses (${items.length})`}
      actions={
        <>
          {selection.length > 0 && (
            <>
              <Button size={"xs"} colorPalette={"red"}>
                Delete Selection
              </Button>

              <Button size={"xs"} colorPalette={"blue"}>
                Modify Selection
              </Button>
            </>
          )}
        </>
      }
      footer={<BrushScrubber />}
    >
      <Table.Root variant={"line"} striped stickyHeader>
        <Table.Header>
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

            <Table.ColumnHeader>
              <span className={styles.header}>Tags</span>
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
    </GenericPage>
  );
};
