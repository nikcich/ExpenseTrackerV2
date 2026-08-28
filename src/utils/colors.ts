import { ExpenseTag, NonExpenseTags } from "@/types/types";

const PALETTE = [
  "#6366F1",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#EC4899",
  "#6B7280",
  "#14B8A6",
  "#E11D48",
  "#84CC16",
  "#D946EF",
  "#0EA5E9",
  "#F43F5E",
  "#FBBF24",
  "#34D399",
  "#60A5FA",
  "#F472B6",
  "#A78BFA",
  "#22D3EE",
  "#F87171",
  "#4ADE80",
  "#E879F9",
  "#818CF8",
  "#FB923C",
  "#2DD4BF",
  "#C084FC",
  "#38BDF8",
  "#FB7185",
  "#A3E635",
  "#FACC15",
  "#4F46E5",
  "#0EA5E9",
  "#DB2777",
  "#059669",
  "#DC2626",
  "#B45309",
  "#7C3AED",
  "#0891B2",
];

const EXPLICIT: Record<string, string> = {
  [ExpenseTag.Food]: "#F59E0B",
  [ExpenseTag.Utilities]: "#06B6D4",
  [ExpenseTag.Rent_Mortgage]: "#6366F1",
  [ExpenseTag.Transportation]: "#10B981",
  [ExpenseTag.Entertainment]: "#EC4899",
  [ExpenseTag.Health_Med]: "#EF4444",
  [ExpenseTag.Shopping]: "#8B5CF6",
  [ExpenseTag.Debt]: "#14B8A6",
  [ExpenseTag.Gifts]: "#F97316",
  [ExpenseTag.Misc]: "#6B7280",
  [ExpenseTag.Motorcycle]: "#E11D48",
  [ExpenseTag.Work]: "#0EA5E9",
  [ExpenseTag.Gas]: "#84CC16",
  [ExpenseTag.One_Off]: "#D946EF",
  [ExpenseTag.Insurance]: "#F43F5E",
  [ExpenseTag.Credit_Repayment]: "#3182ce",
  [ExpenseTag.Vacation_Travel]: "#38a169",
  [NonExpenseTags.Income]: "#2ecc71",
  [NonExpenseTags.Savings]: "#facc15",
  Ungrouped: "#8b5cf6",
  Other: "#6B7280",
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function colorForName(name: string): string {
  if (EXPLICIT[name]) return EXPLICIT[name];
  return PALETTE[hashString(name) % PALETTE.length];
}

export function colorForNames(names: string[]): string[] {
  return names.map(colorForName);
}
