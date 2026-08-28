import { Expense } from "@/types/types";
import { format } from "date-fns";

export function searchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function expenseMatchesSearch(e: Expense, query: string): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;

  const dateStr = format(new Date(e.date), "MM-dd-yyyy").toLowerCase();

  const matchesTerm = (term: string) =>
    e.description.toLowerCase().includes(term) ||
    e.tags.some((t) => String(t).toLowerCase().includes(term)) ||
    (e.group ?? "").toLowerCase().includes(term) ||
    e.amount.toFixed(2).includes(term) ||
    dateStr.includes(term) ||
    e.date.includes(term);

  return terms.every(matchesTerm);
}
