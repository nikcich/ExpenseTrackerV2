import { Expense, API, Response } from "@/types/types";
import { save, open } from "@tauri-apps/plugin-dialog";
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

export async function exportAllData(): Promise<string | null> {
  const response: Response<{ version: number; data: Record<string, unknown> }> =
    await invoke(API.ExportAllData);

  if (response.status !== 200) {
    throw new Error(response.header);
  }

  const json = JSON.stringify(response.message, null, 2);

  const path = await save({
    defaultPath: "expense-tracker-backup.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) return null;

  await invoke(API.SaveCSV, { path, content: json });
  return path;
}

export async function importAllData(): Promise<string[]> {
  const path = await open({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) return [];

  const readResponse: Response<string> = await invoke(API.ReadTextFile, {
    path: path as string,
  });

  if (readResponse.status !== 200 || !readResponse.message) {
    throw new Error(readResponse.header);
  }

  const parsed = JSON.parse(readResponse.message);

  const response: Response<{ imported_keys: string[] }> = await invoke(
    API.ImportAllData,
    { data: parsed }
  );

  if (response.status !== 200) {
    throw new Error(response.header);
  }

  return response.message?.imported_keys ?? [];
}
