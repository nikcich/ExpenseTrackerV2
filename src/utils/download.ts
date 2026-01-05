import { Expense } from "@/types/types";

function exportExpensesToCSV(expenses: Expense[]): string {
  const header = ["Tags", "Date", "Description", "Amount"];

  const rows = expenses.map((expense) => {
    const firstTag = expense.tags[0] || "";
    const date = expense.date;
    const description = expense.description.replace(/"/g, '""'); // escape quotes
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

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function downloadExpensesCSV(expenses: Expense[]) {
  const csvString = exportExpensesToCSV(expenses);
  downloadCSV("expenses.csv", csvString);
}
