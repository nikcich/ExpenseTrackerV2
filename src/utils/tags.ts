import {
  useExpenses,
  useIncome,
  useSavings,
} from "@/hooks/expenses";
import { ALL_TAGS } from "@/types/types";
import { useMemo, useRef } from "react";

export const useAllTags = (includeNonExpenseTags?: boolean) => {
  const expenses = useExpenses();
  const savings = useSavings();
  const income = useIncome();

  const prevRef = useRef<Set<string> | null>(null);

  return useMemo(() => {
    const next = new Set<string>();

    for (const e of expenses) {
      for (const t of e.tags) next.add(t);
    }
    for (const e of savings) {
      for (const t of e.tags) next.add(t);
    }
    for (const e of income) {
      for (const t of e.tags) next.add(t);
    }
    for (const t of ALL_TAGS) {
      next.add(t);
    }

    const prev = prevRef.current;

    if (prev && prev.size === next.size) {
      let identical = true;
      for (const t of next) {
        if (!prev.has(t)) {
          identical = false;
          break;
        }
      }

      if (identical) {
        return prev; // 👈 preserve reference
      }
    }

    if (!includeNonExpenseTags) {
      next.delete("Income");
      next.delete("Savings");
    }

    prevRef.current = next;
    return next;
  }, [expenses, savings, income, includeNonExpenseTags]);
};

export const useAllTagsOptions = (includeNonExpenseTags?: boolean) => {
  const tags = useAllTags(includeNonExpenseTags);

  return useMemo(
    () => [...tags].map((tag) => ({ value: tag, label: tag })),
    [tags]
  );
};

export const useAllGroups = () => {
  const expenses = useExpenses();
  const savings = useSavings();
  const income = useIncome();

  const prevRef = useRef<string[] | null>(null);

  return useMemo(() => {
    const next = new Set<string>();

    for (const e of expenses) {
      if (e.group) next.add(e.group);
    }
    for (const e of savings) {
      if (e.group) next.add(e.group);
    }
    for (const e of income) {
      if (e.group) next.add(e.group);
    }

    const sorted = [...next].sort((a, b) => a.localeCompare(b));
    const prev = prevRef.current;

    if (
      prev &&
      prev.length === sorted.length &&
      prev.every((g, i) => g === sorted[i])
    ) {
      return prev; // preserve reference
    }

    prevRef.current = sorted;
    return sorted;
  }, [expenses, savings, income]);
};
