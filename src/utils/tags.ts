import {
  useExpenses,
  useIncome,
  useRetirement,
  useSavings,
} from "@/hooks/expenses";
import { ALL_TAGS } from "@/types/types";
import { useMemo, useRef } from "react";

export const useAllTags = () => {
  const expenses = useExpenses();
  const savings = useSavings();
  const retirement = useRetirement();
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
    for (const e of retirement) {
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

    next.delete("Income");
    next.delete("Retirement");
    next.delete("Savings");

    prevRef.current = next;
    return next;
  }, [expenses, savings, retirement, income]);
};

export const useAllTagsOptions = () => {
  const tags = useAllTags();

  return useMemo(
    () => [...tags].map((tag) => ({ value: tag, label: tag })),
    [tags]
  );
};
