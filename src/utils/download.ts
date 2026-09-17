import { Expense, Response } from "@/types/types";
import { getActiveService } from "@/services/ServiceProvider";

function exportExpensesToCSV(expenses: Expense[]): string {
  const header = ["Group", "Tags", "Date", "Description", "Amount"];

  const rows = expenses.map((expense) => {
    const group = expense.group ?? "";
    const firstTag = expense.tags[0] || "";
    const date = expense.date;
    const description = expense.description.replace(/"/g, '""');
    const amount = expense.amount.toString();

    const formatValue = (value: string) =>
      /[",\n]/.test(value) ? `"${value}"` : value;

    return [
      formatValue(group),
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

  const service = getActiveService();
  if (!service) return null;

  const path = await service.saveFileDialog({
    defaultPath: "expenses.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (!path) return null;

  await service.saveCsvToPath(path, csvString);
  return path;
}

export async function exportAllData(): Promise<string | null> {
  const service = getActiveService();
  if (!service) return null;

  const response: Response<{ version: number; data: Record<string, unknown> }> =
    await service.exportAllData();

  if (response.status !== 200) {
    throw new Error(response.header);
  }

  const json = JSON.stringify(response.message, null, 2);

  const path = await service.saveFileDialog({
    defaultPath: "expense-tracker-backup.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) return null;

  await service.saveCsvToPath(path, json);
  return path;
}

export async function importAllData(): Promise<string[]> {
  const service = getActiveService();
  if (!service) return [];

  const picked = await service.openFileDialog({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!picked) return [];

  const path = typeof picked === "string" ? picked : picked[0];
  if (!path) return [];

  const readResponse: Response<string> = await service.readTextFile(path);

  if (readResponse.status !== 200 || !readResponse.message) {
    throw new Error(readResponse.header);
  }

  const parsed = JSON.parse(readResponse.message);

  const response: Response<{ imported_keys: string[] }> =
    await service.importAllData(parsed);

  if (response.status !== 200) {
    throw new Error(response.header);
  }

  return response.message?.imported_keys ?? [];
}
