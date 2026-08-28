import { MOCK_DATA_MAP } from "@/types/mockExpenses";
import { API } from "@/types/types";

type Response<T> = { status: number; message?: T; header?: string };

const WRITE_COMMANDS = new Set<string>([
  API.SetJsonValue,
  API.SetDateRange,
  API.UpdateExpense,
  API.AddManualExpense,
  API.RemoveExpense,
  API.RemoveBulkExpenses,
  API.UpdateBulkExpenses,
  API.SaveCSV,
  API.ReadCSVPreview,
  API.PreviewParseCSV,
  API.ExportAllData,
  API.ImportAllData,
]);

const mockByKey = (key: string) =>
  (MOCK_DATA_MAP as Record<string, unknown>)[key];

const readFromStore = async (key: string): Promise<unknown> => {
  try {
    const raw = localStorage.getItem(`demo-store:${key}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore corrupt local storage */
  }
  return null;
};

export async function invoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<Response<T>> {
  if (command === API.SaveCSV) {
    const content = (args?.content as string) ?? "";
    const path = (args?.path as string) ?? "download";
    triggerDownload(content, path.split("/").pop() ?? "file");
    return { status: 200, message: undefined as unknown as T, header: "" };
  }

  if (WRITE_COMMANDS.has(command)) {
    console.warn(`[demo] write command ignored: ${command}`);
    return { status: 200, message: undefined as unknown as T, header: "" };
  }

  const key = args?.key as string | undefined;

  if (command === "store_get_json_value" || command === API.GetJsonValue) {
    if (key) {
      const stored = await readFromStore(key);
      return { status: 200, message: (stored ?? mockByKey(key)) as unknown as T, header: "" };
    }
    const stored = await readFromStore(command);
    return { status: 200, message: (stored ?? mockByKey(command)) as unknown as T, header: "" };
  }

  if (command === API.DateRange) {
    return { status: 200, message: mockByKey("date_range") as unknown as T, header: "" };
  }

  return { status: 404, message: undefined, header: `unknown command: ${command}` };
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


