import { Button, Flex, Input, Text } from "@chakra-ui/react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@chakra-ui/react";
import { format } from "date-fns";
import { useQuickTag } from "@/hooks/useQuickTag";
import { QuickTagRadial } from "../QuickTagRadial/QuickTagRadial";

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
                : "orange"
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

const DataTableActions = () => {
  const selection = useSelection();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteSelection = useCallback(async (selection: string[]) => {
    await invoke<Response<string>>(API.RemoveBulkExpenses, {
      hashes: selection,
    });

    setSelection([]);
  }, []);

  return (
    <>
      {selection.length > 0 && (
        <>
          <Text>{selection.length} selected</Text>
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
            onClick={() => setDeleteOpen(true)}
          >
            Delete Selection
          </Button>

          <DialogRoot
            open={deleteOpen}
            onOpenChange={(e) => setDeleteOpen(e.open)}
          >
            <DialogBackdrop />
            <DialogTrigger />
            <DialogPositioner>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {selection.length} expense(s)?</DialogTitle>
                  <DialogCloseTrigger />
                </DialogHeader>
                <DialogBody>
                  <Text>This action cannot be undone.</Text>
                </DialogBody>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorPalette="red"
                    onClick={() => {
                      handleDeleteSelection(selection);
                      setDeleteOpen(false);
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </DialogPositioner>
          </DialogRoot>
        </>
      )}
      <Button
        size={"xs"}
        colorPalette={"green"}
        onClick={() => enableOverlay(Overlay.ManualModal)}
      >
        Create Expense
      </Button>
    </>
  );
};

export const DataTable = ({ items }: { items: Expense[] }) => {
  const [searchString, setSearchString] = useState("");

  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeUntagged, setIncludeUntagged] = useState(true);

  // Normalize search string once
  const normalizedSearch = useMemo(
    () => searchString.trim().toLowerCase(),
    [searchString]
  );

  // Defer expensive filtering while typing
  const deferredSearch = useDeferredValue(normalizedSearch);

  // Debounce setter ONCE
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setSearchString(value), 300),
    []
  );

  useEffect(() => {
    return () => debouncedSetSearch.cancel();
  }, [debouncedSetSearch]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isIncome =
        item.tags.includes(NonExpenseTags.Income);

      const isSavings = item.tags.includes(NonExpenseTags.Savings);
      const isUntagged = item.tags.length === 0;
      const isExpense = !isIncome && !isSavings && !isUntagged;

      if (!includeIncome && isIncome) return false;
      if (!includeSavings && isSavings) return false;
      if (!includeExpenses && isExpense) return false;
      if (!includeUntagged && isUntagged) return false;

      if (deferredSearch) {
        const searchStr = deferredSearch.toLowerCase();
        const matchesDescription = item.description.toLowerCase().includes(searchStr);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(searchStr));
        const matchesAmount = item.amount.toFixed(2).includes(searchStr);
        const matchesDate = format(new Date(item.date), "MM-dd-yyyy").includes(searchStr) || item.date.includes(searchStr);

        if (!matchesDescription && !matchesTags && !matchesAmount && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    deferredSearch,
    includeIncome,
    includeExpenses,
    includeSavings,
    includeUntagged,
  ]);

  return (
    <GenericPage
      title={`Expenses (${filteredItems.length})`}
      actions={<DataTableActions />}
      footer={<BrushScrubber />}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "1rem",
            paddingBottom: "0.5rem",
            width: "100%",
            alignItems: "flex-start",
          }}
        >
          <Button
            variant={includeIncome ? "solid" : "outline"}
            colorPalette="green"
            onClick={() => setIncludeIncome((v) => !v)}
          >
            Income {includeIncome ? "Included" : "Excluded"}
          </Button>

          <Button
            variant={includeExpenses ? "solid" : "outline"}
            colorPalette="red"
            onClick={() => setIncludeExpenses((v) => !v)}
          >
            Expenses {includeExpenses ? "Included" : "Excluded"}
          </Button>

          <Button
            variant={includeSavings ? "solid" : "outline"}
            colorPalette="yellow"
            onClick={() => setIncludeSavings((v) => !v)}
          >
            Savings {includeSavings ? "Included" : "Excluded"}
          </Button>

          <Button
            variant={includeUntagged ? "solid" : "outline"}
            colorPalette="gray"
            onClick={() => setIncludeUntagged((v) => !v)}
          >
            Untagged {includeUntagged ? "Included" : "Excluded"}
          </Button>
        </div>

        <Input
          type="search"
          placeholder="Search..."
          onChange={(e) => debouncedSetSearch(e.target.value)}
          style={{
            width: "100%",
            zIndex: 100,
            minHeight: "40px",
          }}
        />

        <div
          style={{
            width: "100%",
            overflow: "hidden",
            flexGrow: 1,
            paddingTop: "0.75rem",
          }}
        >
          <CoreTable items={filteredItems} />
        </div>
      </div>
    </GenericPage>
  );
};

const ROW_HEIGHT = 70;
const OVERSCAN = 5;

const PaginationIndicator = ({
  endIndex,
  total,
  scrollTop,
}: {
  endIndex: number;
  total: number;
  scrollTop: number;
}) => {
  if (total === 0) return null;

  const firstVisible = Math.max(1, Math.floor(scrollTop / ROW_HEIGHT) + 1);
  const lastVisible = Math.min(total, endIndex);

  return (
    <Flex
      justify="flex-end"
      px={4}
      py={1.5}
      borderTop="1px solid"
      borderColor="var(--chakra-colors-border-muted)"
      fontSize="xs"
      color="fg.subtle"
      flexShrink={0}
    >
      <Text>
        {firstVisible}–{lastVisible} of {total}
      </Text>
    </Flex>
  );
};

type RowProps = {
  item: Expense;
  selected: boolean;
  onToggle: (id: string, index: number, shift: boolean) => void;
  onEdit: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  index: number;
  selectable: boolean;
};

const GRID_WITH_CHECK = "50px 150px 150px 1fr 100px";
const GRID_NO_CHECK = "150px 150px 1fr 100px";

const TableRow = memo<RowProps>(
  ({ item, index, selected, onToggle, onEdit, onMouseEnter, onMouseLeave, selectable }) => {
    return (
      <tr
        data-selected={selected ? "" : undefined}
        onDoubleClick={() => onEdit(item.id)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ gridTemplateColumns: selectable ? GRID_WITH_CHECK : GRID_NO_CHECK }}
      >
        {selectable && (
          <td
            className={styles.leftCenterContent}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id, index, e.shiftKey);
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item.id, index, e.shiftKey);
              }}
            />
          </td>
        )}

        <td className={styles.leftCenterContent}>
          <TagCell tags={item.tags} />
        </td>

        <td className={styles.leftCenterContent}>
          {format(new Date(item.date), "MM-dd-yyyy")}
        </td>

        <td className={styles.leftCenterContent}>{item.description}</td>

        <td className={styles.leftCenterContent}>
          <span className={item.amount < 0 ? styles.income : styles.expense}>
            ${item.amount.toFixed(2)}
          </span>
        </td>
      </tr>
    );
  }
);

export const CoreTable = memo(({ items, selectable = true }: { items: Expense[]; selectable?: boolean }) => {
  const selection = useSelection();
  const [sortColumn, setSortColumn] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [scrollTop, setScrollTop] = useState(0);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const quickTag = useQuickTag();

  const handleSort = useCallback(
    (column: SortKey) => {
      if (column === sortColumn) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortDirection("asc");
      }

      setSortColumn(column);
    },
    [sortColumn]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (sortColumn === "tags") {
        return sortDirection === "asc"
          ? a.tags.length - b.tags.length
          : b.tags.length - a.tags.length;
      }

      if (sortColumn === "date") {
        return compareDates(aVal as string, bVal as string, sortDirection);
      }

      if (typeof aVal === "number") {
        return sortDirection === "asc"
          ? aVal - (bVal as number)
          : (bVal as number) - aVal;
      }

      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, sortColumn, sortDirection]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);

  const endIndex = Math.min(
    sortedItems.length,
    startIndex + visibleCount + OVERSCAN * 2
  );

  const visibleItems = sortedItems.slice(startIndex, endIndex);

  const toggleSelection = useCallback(
    (id: string, index: number, shift: boolean) => {
      setSelection((prev) => {
        if (!shift) {
          lastSelectedIndexRef.current = index;
          return prev.includes(id)
            ? prev.filter((x) => x !== id)
            : [...prev, id];
        }

        const start = lastSelectedIndexRef.current ?? 0;

        const [from, to] = start < index ? [start, index] : [index, start];

        const rangeIds = sortedItems.slice(from, to + 1).map((i) => i.id);

        lastSelectedIndexRef.current = index;

        const merged = new Set(prev);
        rangeIds.forEach((id) => merged.add(id));

        return Array.from(merged);
      });
    },
    [setSelection, sortedItems]
  );

  const editRow = useCallback((id: string) => {
    setSelection([id]);
    enableOverlay(Overlay.EditModal);
  }, []);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;

    headerCheckboxRef.current.indeterminate =
      selection.length > 0 && selection.length < items.length;
  }, [selection.length, items.length]);

  return (
    <div className={styles.virtualizedTable}>
      {/* ===== Sticky Header ===== */}
      <table className={styles.headerTable}>
        <thead>
          <tr style={{ gridTemplateColumns: selectable ? GRID_WITH_CHECK : GRID_NO_CHECK }}>
            {selectable && (
              <th
                onClick={(e) => {
                  e.stopPropagation();
                  setSelection(
                    selection.length === 0 ? items.map((i) => i.id) : []
                  );
                }}
                className={styles.leftCenterContent}
              >
                <input
                  ref={headerCheckboxRef}
                  className={styles.headerCheckbox}
                  type="checkbox"
                  checked={selection.length === items.length}
                  onChange={(e) =>
                    setSelection(e.target.checked ? items.map((i) => i.id) : [])
                  }
                />
              </th>
            )}

            <th
              onClick={() => handleSort("tags")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Tags
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
                Date
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
                Description
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
                Amount
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
      </table>

      {/* ===== Scrollable Virtualized Body ===== */}
      <div className={styles.bodyScroll} ref={bodyRef} onScroll={onScroll}>
        <div
          className={styles.spacer}
          style={{ height: sortedItems.length * ROW_HEIGHT }}
        >
          <table
            className={styles.bodyTable}
            style={{
              transform: `translateY(${startIndex * ROW_HEIGHT}px)`,
            }}
          >
            <tbody>
              {visibleItems.map((item) => {
                const index = sortedItems.findIndex((i) => i.id === item.id);

                return (
                  <TableRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={selection.includes(item.id)}
                    onToggle={toggleSelection}
                    onEdit={editRow}
                    onMouseEnter={() => quickTag.setHoveredRowId(item.id)}
                    onMouseLeave={() => quickTag.setHoveredRowId(null)}
                    selectable={selectable}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationIndicator
        endIndex={endIndex}
        total={sortedItems.length}
        scrollTop={scrollTop}
      />

      {quickTag.isActive && (
        <QuickTagRadial
          tags={quickTag.frequentTags}
          appliedTags={quickTag.appliedTags}
          position={quickTag.position}
          hoveredTag={quickTag.hoveredTag}
          onTagEnter={quickTag.onTagEnter}
          onTagLeave={quickTag.onTagLeave}
        />
      )}
    </div>
  );
});
