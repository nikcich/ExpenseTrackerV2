import { Expense, API } from "@/types/types";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

function exportExpensesToCSV(expenses: Expense[]): string {
  const header = ["Tags", "Date", "Description", "Amount"];

  const rows = expenses.map((expense) => {
    const firstTag = expense.tags[0] || "";
    const date = expense.date;
    const description = expense.description.replace(/"/g, '""');
    const amount = expense.amount.toString();

    const formatValue = (value: string) =>
      /[",\n]/.test(value) ? `"${value}"` : value;

    return [
      formatValue(firstTag),
      formatValue(date),
      formatValue(description),
      formatValue(amount),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export async function downloadExpensesCSV(
  expenses: Expense[]
): Promise<string | null> {
  const csvString = exportExpensesToCSV(expenses);

  const path = await save({
    defaultPath: "expenses.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (!path) return null;

  await invoke(API.SaveCSV, { path, content: csvString });
  return path;
}
