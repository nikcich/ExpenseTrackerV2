import { Flex, Input, Text } from "@chakra-ui/react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Expense, Tag } from "@/types/types";
import { getExpenseKind, ExpenseKind } from "@/utils/expense-utils";
import { BrushScrubber } from "../Brush/BrushScrubber";
import { GenericPage } from "../GenericPage/GenericPage";
import { Tag as TagComp } from "@chakra-ui/react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronUp } from "react-icons/fa";
import styles from "./DataTable.module.scss";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { useSettingsStore } from "@/store/SettingsStore";
import { debounce } from "lodash";
import { format } from "date-fns";
import { formatCompactCurrency } from "@/utils/utils";
import { expenseMatchesSearch } from "@/utils/search";
import { useQuickWheel } from "@/hooks/useQuickWheel";
import { RadialActions } from "../RadialActions/RadialActions";

const kindPalette = (kind: ExpenseKind) =>
  kind === "income" ? "green" : kind === "savings" ? "yellow" : "purple";

const GroupCell = ({
  group,
  kind,
}: {
  group?: string;
  kind: ExpenseKind;
}) => {
  return (
    <div className={styles.tagCell}>
      {group && (
        <TagComp.Root colorPalette={kindPalette(kind)}>
          <TagComp.Label>{group}</TagComp.Label>
        </TagComp.Root>
      )}
    </div>
  );
};

const TagsCell = ({ tags }: { tags: Tag[] }) => {
  return (
    <div className={styles.tagCell}>
      {tags.map((tag) => (
        <TagComp.Root key={tag} colorPalette="orange">
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
  const [searchString, setSearchString] = useState("");

  const normalizedSearch = useMemo(
    () => searchString.trim().toLowerCase(),
    [searchString]
  );

  const deferredSearch = useDeferredValue(normalizedSearch);

  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setSearchString(value), 300),
    []
  );

  useEffect(() => {
    return () => debouncedSetSearch.cancel();
  }, [debouncedSetSearch]);

  const filteredItems = useMemo(() => {
    if (!deferredSearch) return items;
    return items.filter((item) => expenseMatchesSearch(item, deferredSearch));
  }, [items, deferredSearch]);

  return (
    <GenericPage
      title={`Expenses (${filteredItems.length})`}
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
  onCellHover: (col: "groups" | "tags" | null) => void;
  index: number;
  selectable: boolean;
  compactAmounts: boolean;
};

const GRID_WITH_CHECK = "50px 130px 150px 150px 1fr 100px";
const GRID_NO_CHECK = "130px 150px 150px 1fr 100px";

const TableRow = memo<RowProps>(
  ({ item, index, selected, onToggle, onEdit, onMouseEnter, onMouseLeave, onCellHover, selectable, compactAmounts }) => {
    return (
      <tr
        data-selected={selected ? "" : undefined}
        onClick={
          selectable
            ? (e) => onToggle(item.id, index, e.shiftKey)
            : undefined
        }
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

        <td
          className={styles.leftCenterContent}
          data-col="group"
          onMouseEnter={() => onCellHover("groups")}
          onMouseLeave={() => onCellHover(null)}
        >
          <GroupCell group={item.group} kind={getExpenseKind(item)} />
        </td>

        <td
          className={styles.leftCenterContent}
          data-col="tags"
          onMouseEnter={() => onCellHover("tags")}
          onMouseLeave={() => onCellHover(null)}
        >
          <TagsCell tags={item.tags} />
        </td>

        <td className={styles.leftCenterContent}>
          {format(new Date(item.date), "MM-dd-yyyy")}
        </td>

        <td className={styles.leftCenterContent}>{item.description}</td>

        <td className={styles.leftCenterContent}>
          <span className={item.amount < 0 ? styles.income : styles.expense}>
            {compactAmounts
              ? formatCompactCurrency(item.amount)
              : `$${item.amount.toFixed(2)}`}
          </span>
        </td>
      </tr>
    );
  }
);

export const CoreTable = memo(({ items, selectable = true }: { items: Expense[]; selectable?: boolean }) => {
  const selection = useSelection();
  const compactAmounts = useSettingsStore("compactAmounts");
  const [sortColumn, setSortColumn] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [scrollTop, setScrollTop] = useState(0);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const quickWheel = useQuickWheel();

  const handleCellHover = useCallback(
    (col: "groups" | "tags" | null) => quickWheel.setHoveredColumn(col),
    [quickWheel.setHoveredColumn]
  );

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

      if (sortColumn === "group") {
        return sortDirection === "asc"
          ? (a.group ?? "").localeCompare(b.group ?? "")
          : (b.group ?? "").localeCompare(a.group ?? "");
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
              onClick={() => handleSort("group")}
              className={styles.leftCenterContent}
            >
              <span className={styles.header}>
                Group
                {sortColumn === "group" &&
                  (sortDirection === "asc" ? (
                    <FaChevronUp size={14} />
                  ) : (
                    <FaChevronDown size={14} />
                  ))}
              </span>
            </th>

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
                    onMouseEnter={() => quickWheel.setHoveredRowId(item.id)}
                    onMouseLeave={() => quickWheel.setHoveredRowId(null)}
                    onCellHover={handleCellHover}
                    selectable={selectable}
                    compactAmounts={compactAmounts}
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

      {quickWheel.isActive && (
        <RadialActions
          actions={quickWheel.actions}
          position={quickWheel.position}
          hoveredAction={quickWheel.hoveredAction}
          onActionEnter={quickWheel.onActionEnter}
          onActionLeave={quickWheel.onActionLeave}
        />
      )}
    </div>
  );
});
