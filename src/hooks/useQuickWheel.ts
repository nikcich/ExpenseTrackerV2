import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useExpensesStore } from "@/store/store";
import { useOverlayStore } from "@/store/OverlayStore";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { API, Expense } from "@/types/types";
import { Pages } from "@/types/routes";
import { INCOME_GROUP, SAVINGS_GROUP } from "@/utils/expense-utils";
import { invoke } from "@tauri-apps/api/core";
import { RadialAction } from "@/components/RadialActions/RadialActions";

const BULK_DELAY_MS = 2000;
const TOP_ACTION_COUNT = 8;

export type WheelMode = "tags" | "groups";

export const useQuickWheel = () => {
  const location = useLocation();
  const selection = useSelection();
  const visibleOverlay = useOverlayStore("visibleOverlay");
  const { value: expenses } = useExpensesStore();

  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<WheelMode | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowIdState] = useState<string | null>(null);

  const hoveredRowIdRef = useRef<string | null>(null);
  const hoveredColumnRef = useRef<WheelMode | null>(null);
  const hoveredActionRef = useRef<string | null>(null);
  const modeRef = useRef<WheelMode | null>(null);
  const bulkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBulkRef = useRef(false);
  const isActiveRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const applyValueRef = useRef<(value: string) => Promise<void>>(
    async () => {},
  );
  const hoverLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lockedRowIdRef = useRef<string | null>(null);
  const lockedSelectionRef = useRef<string[]>([]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const frequentTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      for (const tag of expense.tags) {
        if (tag === INCOME_GROUP || tag === SAVINGS_GROUP) continue;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_ACTION_COUNT)
      .map(([tag]) => tag);
  }, [expenses]);

  const frequentGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      if (!expense.group) continue;
      counts.set(expense.group, (counts.get(expense.group) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_ACTION_COUNT)
      .map(([group]) => group);
  }, [expenses]);

  const getExpenseById = useCallback(
    (id: string): Expense | undefined => {
      return expenses?.find((e) => e.id === id);
    },
    [expenses],
  );

  const applyTag = useCallback(
    async (tag: string) => {
      if (isBulkRef.current) {
        const selectedExpenses = lockedSelectionRef.current
          .map((id) => getExpenseById(id))
          .filter((e): e is Expense => e !== undefined);

        const allHaveTag = selectedExpenses.every((e) => e.tags.includes(tag));

        const expensesToUpdate = allHaveTag
          ? selectedExpenses
          : selectedExpenses.filter((e) => !e.tags.includes(tag));

        if (expensesToUpdate.length === 0) return;

        await invoke(API.UpdateBulkExpenses, {
          hashes: expensesToUpdate.map((e) => e.id),
          expenses: expensesToUpdate.map((e) => ({
            ...e,
            tags: allHaveTag
              ? e.tags.filter((t) => t !== tag)
              : [...e.tags, tag],
          })),
        });

        setSelection([]);
      } else {
        const rowId = lockedRowIdRef.current;
        if (!rowId) return;

        const expense = getExpenseById(rowId);
        if (!expense) return;

        const newTags = expense.tags.includes(tag)
          ? expense.tags.filter((t) => t !== tag)
          : [...expense.tags, tag];

        await invoke(API.UpdateExpense, {
          hash: rowId,
          expense: { ...expense, tags: newTags },
        });
      }
    },
    [getExpenseById],
  );

  const applyGroup = useCallback(
    async (group: string) => {
      if (isBulkRef.current) {
        const selectedExpenses = lockedSelectionRef.current
          .map((id) => getExpenseById(id))
          .filter((e): e is Expense => e !== undefined);

        if (selectedExpenses.length === 0) return;

        const allHaveGroup = selectedExpenses.every((e) => e.group === group);

        const expensesToUpdate = allHaveGroup
          ? selectedExpenses
          : selectedExpenses.filter((e) => e.group !== group);

        if (expensesToUpdate.length === 0) return;

        await invoke(API.UpdateBulkExpenses, {
          hashes: expensesToUpdate.map((e) => e.id),
          expenses: expensesToUpdate.map((e) => ({
            ...e,
            group: allHaveGroup ? undefined : group,
          })),
        });

        setSelection([]);
      } else {
        const rowId = lockedRowIdRef.current;
        if (!rowId) return;

        const expense = getExpenseById(rowId);
        if (!expense) return;

        await invoke(API.UpdateExpense, {
          hash: rowId,
          expense: {
            ...expense,
            group: expense.group === group ? undefined : group,
          },
        });
      }
    },
    [getExpenseById],
  );

  applyValueRef.current = (value: string) =>
    modeRef.current === "groups" ? applyGroup(value) : applyTag(value);

  const cleanup = useCallback(() => {
    if (bulkTimerRef.current) {
      clearTimeout(bulkTimerRef.current);
      bulkTimerRef.current = null;
    }
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    setIsActive(false);
    isActiveRef.current = false;
    setMode(null);
    modeRef.current = null;
    setHoveredAction(null);
    hoveredActionRef.current = null;
    lockedRowIdRef.current = null;
    lockedSelectionRef.current = [];
    isBulkRef.current = false;
  }, []);

  const setHoveredRowId = useCallback((id: string | null) => {
    if (id === null && isActiveRef.current) return;
    hoveredRowIdRef.current = id;
    setHoveredRowIdState(id);
  }, []);

  const setHoveredColumn = useCallback((col: WheelMode | null) => {
    hoveredColumnRef.current = col;
  }, []);

  const onActionEnter = useCallback((action: string) => {
    if (hoverLeaveTimeoutRef.current) {
      clearTimeout(hoverLeaveTimeoutRef.current);
      hoverLeaveTimeoutRef.current = null;
    }
    hoveredActionRef.current = action;
    setHoveredAction(action);
  }, []);

  const onActionLeave = useCallback(() => {
    hoverLeaveTimeoutRef.current = setTimeout(() => {
      hoveredActionRef.current = null;
      setHoveredAction(null);
    }, 80);
  }, []);

  useEffect(() => {
    const isTableView = location.pathname === Pages.TableView;

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;

      const targetMode = hoveredColumnRef.current;
      if (!targetMode) return;

      if (visibleOverlay !== undefined) return;
      if (!isTableView) return;
      if (isActiveRef.current) return;

      e.preventDefault();

      const { x, y } = mousePosRef.current;

      if (selectionRef.current.length > 0) {
        isBulkRef.current = true;
        lockedSelectionRef.current = [...selectionRef.current];
        bulkTimerRef.current = setTimeout(() => {
          setIsActive(true);
          isActiveRef.current = true;
          setMode(targetMode);
          modeRef.current = targetMode;
          setPosition({ x, y });
        }, BULK_DELAY_MS);
      } else {
        if (!hoveredRowIdRef.current) return;
        isBulkRef.current = false;
        lockedRowIdRef.current = hoveredRowIdRef.current;
        setIsActive(true);
        isActiveRef.current = true;
        setMode(targetMode);
        modeRef.current = targetMode;
        setPosition({ x, y });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;

      if (bulkTimerRef.current) {
        clearTimeout(bulkTimerRef.current);
        bulkTimerRef.current = null;
      }

      if (isBulkRef.current && !isActiveRef.current) {
        isBulkRef.current = false;
        return;
      }

      if (isActiveRef.current && hoveredActionRef.current) {
        applyValueRef.current(hoveredActionRef.current);
      }

      cleanup();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [location.pathname, visibleOverlay, cleanup]);

  const appliedActionIds: Set<string> = useMemo(() => {
    const pickValues = (expense: Expense): string[] =>
      modeRef.current === "groups"
        ? expense.group
          ? [expense.group]
          : []
        : expense.tags;

    if (isBulkRef.current && selection.length > 0) {
      const rows = selection
        .map((id) => getExpenseById(id))
        .filter((e): e is Expense => e !== undefined);

      if (rows.length === 0) return new Set();

      const common = new Set(pickValues(rows[0]));
      for (let i = 1; i < rows.length; i++) {
        for (const v of common) {
          if (!pickValues(rows[i]).includes(v)) common.delete(v);
        }
      }
      return common;
    }

    if (hoveredRowId) {
      const expense = getExpenseById(hoveredRowId);
      return expense ? new Set(pickValues(expense)) : new Set();
    }
    return new Set();
  }, [hoveredRowId, selection, getExpenseById, isActive]);

  const actions: RadialAction[] = useMemo(
    () =>
      (mode === "groups" ? frequentGroups : frequentTags).map((label) => ({
        id: label,
        label,
        active: appliedActionIds.has(label),
      })),
    [mode, frequentGroups, frequentTags, appliedActionIds],
  );

  return {
    isActive,
    position,
    actions,
    hoveredAction,
    setHoveredRowId,
    setHoveredColumn,
    onActionEnter,
    onActionLeave,
  };
};
