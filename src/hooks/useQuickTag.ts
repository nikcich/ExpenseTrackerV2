import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useExpensesStore } from "@/store/store";
import { useOverlayStore } from "@/store/OverlayStore";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { API, Expense, Tag } from "@/types/types";
import { Pages } from "@/types/routes";
import { invoke } from "@tauri-apps/api/core";

const BULK_DELAY_MS = 2000;
const TOP_TAG_COUNT = 8;

export const useQuickTag = () => {
  const location = useLocation();
  const selection = useSelection();
  const visibleOverlay = useOverlayStore("visibleOverlay");
  const { value: expenses } = useExpensesStore();

  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowIdState] = useState<string | null>(null);

  const hoveredRowIdRef = useRef<string | null>(null);
  const hoveredTagRef = useRef<string | null>(null);
  const bulkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBulkRef = useRef(false);
  const isActiveRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const applyTagRef = useRef<(tag: string) => Promise<void>>(async () => {});
  const hoverTagLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRowIdRef = useRef<string | null>(null);
  const lockedSelectionRef = useRef<string[]>([]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const frequentTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const expense of expenses) {
      for (const tag of expense.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_TAG_COUNT)
      .map(([tag]) => tag);
  }, [expenses]);

  const getExpenseById = useCallback(
    (id: string): Expense | undefined => {
      return expenses?.find((e) => e.id === id);
    },
    [expenses]
  );

  const applyTag = useCallback(
    async (tag: string) => {
      if (isBulkRef.current) {
        const expensesToUpdate: Expense[] = lockedSelectionRef.current
          .map((id) => getExpenseById(id))
          .filter(
            (e): e is Expense => e !== undefined && !e.tags.includes(tag)
          );

        if (expensesToUpdate.length === 0) return;

        await invoke(API.UpdateBulkExpenses, {
          hashes: expensesToUpdate.map((e) => e.id),
          expenses: expensesToUpdate.map((e) => ({
            ...e,
            tags: [...e.tags, tag],
          })),
        });

        setSelection([]);
      } else {
        const rowId = lockedRowIdRef.current;
        if (!rowId) return;

        const expense = getExpenseById(rowId);
        if (!expense || expense.tags.includes(tag)) return;

        await invoke(API.UpdateExpense, {
          hash: rowId,
          expense: { ...expense, tags: [...expense.tags, tag] },
        });
      }
    },
    [getExpenseById]
  );

  applyTagRef.current = applyTag;

  const cleanup = useCallback(() => {
    if (bulkTimerRef.current) {
      clearTimeout(bulkTimerRef.current);
      bulkTimerRef.current = null;
    }
    if (hoverTagLeaveTimeoutRef.current) {
      clearTimeout(hoverTagLeaveTimeoutRef.current);
      hoverTagLeaveTimeoutRef.current = null;
    }
    setIsActive(false);
    isActiveRef.current = false;
    setHoveredTag(null);
    hoveredTagRef.current = null;
    lockedRowIdRef.current = null;
    lockedSelectionRef.current = [];
    isBulkRef.current = false;
  }, []);

  const setHoveredRowId = useCallback((id: string | null) => {
    hoveredRowIdRef.current = id;
    setHoveredRowIdState(id);
  }, []);

  const onTagEnter = useCallback((tag: string) => {
    if (hoverTagLeaveTimeoutRef.current) {
      clearTimeout(hoverTagLeaveTimeoutRef.current);
      hoverTagLeaveTimeoutRef.current = null;
    }
    hoveredTagRef.current = tag;
    setHoveredTag(tag);
  }, []);

  const onTagLeave = useCallback(() => {
    hoverTagLeaveTimeoutRef.current = setTimeout(() => {
      hoveredTagRef.current = null;
      setHoveredTag(null);
    }, 80);
  }, []);

  useEffect(() => {
    const isTableView = location.pathname === Pages.TableView;

    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Control") return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

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
          setPosition({ x, y });
        }, BULK_DELAY_MS);
      } else {
        isBulkRef.current = false;
        lockedRowIdRef.current = hoveredRowIdRef.current;
        setIsActive(true);
        isActiveRef.current = true;
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

      if (isActiveRef.current && hoveredTagRef.current) {
        applyTagRef.current(hoveredTagRef.current);
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
  }, [location.pathname, visibleOverlay]);

  const appliedTags: Tag[] = useMemo(() => {
    if (isBulkRef.current && selection.length > 0) {
      const tagSets = selection
        .map((id) => getExpenseById(id))
        .filter((e): e is Expense => e !== undefined)
        .map((e) => new Set(e.tags));

      if (tagSets.length === 0) return [];
      const common = tagSets[0];
      for (let i = 1; i < tagSets.length; i++) {
        for (const t of common) {
          if (!tagSets[i].has(t)) common.delete(t);
        }
      }
      return [...common];
    }

    if (hoveredRowId) {
      return getExpenseById(hoveredRowId)?.tags ?? [];
    }
    return [];
  }, [hoveredRowId, selection, getExpenseById, isActive]);

  return {
    isActive,
    position,
    frequentTags,
    hoveredTag,
    appliedTags,
    setHoveredRowId,
    onTagEnter,
    onTagLeave,
  };
};
