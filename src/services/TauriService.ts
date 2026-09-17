import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { revealItemInDir as tauriRevealItemInDir } from "@tauri-apps/plugin-opener";
import { API, type Expense, type PreviewResult, type Response } from "@/types/types";
import type {
  CsvParseResponse,
  ExpenseTrackerService,
  ExportAllDataResponse,
  ImportAllDataResponse,
  OpenFileDialogOptions,
  SaveFileDialogOptions,
  Unsubscribe,
} from "./ExpenseTrackerService";

export class TauriService implements ExpenseTrackerService {
  async getStoreValue<T>(key: string): Promise<Response<T>> {
    return await invoke<Response<T>>(API.GetJsonValue, { key });
  }

  async setStoreValue<T>(key: string, value: T): Promise<Response<null>> {
    return await invoke<Response<null>>(API.SetJsonValue, { key, value });
  }

  onStoreChanged(callback: (key: string) => void): Unsubscribe {
    let unlisten: (() => void) | undefined;
    listen<{ key: string }>("store-changed", (event) => {
      callback(event.payload.key);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }

  async addExpenseManual(expense: Expense): Promise<Response<null>> {
    return await invoke<Response<null>>(API.AddManualExpense, { expense });
  }

  async updateExpense(hash: string, expense: Expense): Promise<Response<null>> {
    return await invoke<Response<null>>(API.UpdateExpense, { hash, expense });
  }

  async updateBulkExpenses(
    hashes: string[],
    expenses: Expense[],
  ): Promise<Response<null>> {
    return await invoke<Response<null>>(API.UpdateBulkExpenses, {
      hashes,
      expenses,
    });
  }

  async removeExpense(hash: string): Promise<Response<null>> {
    return await invoke<Response<null>>(API.RemoveExpense, { hash });
  }

  async removeBulkExpenses(hashes: string[]): Promise<Response<null>> {
    return await invoke<Response<null>>(API.RemoveBulkExpenses, { hashes });
  }

  async openCsvFromPath(
    file: string,
    customDefinitionsJson?: string | null,
  ): Promise<Response<string[]>> {
    return await invoke<Response<string[]>>(API.OpenCSV, {
      file,
      customDefinitionsJson: customDefinitionsJson ?? undefined,
    });
  }

  async parseCsvFromPath(
    path: string,
    csvDefinitionKey: string,
    customDefinitionsJson?: string | null,
  ): Promise<Response<CsvParseResponse>> {
    return await invoke<Response<CsvParseResponse>>(API.ParseCSV, {
      path,
      csvDefinitionKey,
      customDefinitionsJson: customDefinitionsJson ?? undefined,
    });
  }

  async saveCsvToPath(path: string, content: string): Promise<Response<string>> {
    return await invoke<Response<string>>(API.SaveCSV, { path, content });
  }

  async readTextFile(path: string): Promise<Response<string>> {
    return await invoke<Response<string>>(API.ReadTextFile, { path });
  }

  async readCsvPreview(path: string, rows: number): Promise<Response<string[][]>> {
    return await invoke<Response<string[][]>>(API.ReadCSVPreview, { path, rows });
  }

  async previewCsvParse(
    path: string,
    definitionJson: string,
  ): Promise<Response<PreviewResult[]>> {
    return await invoke<Response<PreviewResult[]>>(API.PreviewParseCSV, {
      path,
      definitionJson,
    });
  }

  async exportAllData(): Promise<Response<ExportAllDataResponse>> {
    return await invoke<Response<ExportAllDataResponse>>(API.ExportAllData);
  }

  async importAllData(
    data: Record<string, unknown>,
  ): Promise<Response<ImportAllDataResponse>> {
    return await invoke<Response<ImportAllDataResponse>>(API.ImportAllData, {
      data,
    });
  }

  async openFileDialog(
    options?: OpenFileDialogOptions,
  ): Promise<string | string[] | null> {
    return (await open(options)) as unknown as string | string[] | null;
  }

  async saveFileDialog(options?: SaveFileDialogOptions): Promise<string | null> {
    return (await save(options)) as string | null;
  }

  async revealItemInDir(path: string): Promise<void> {
    await tauriRevealItemInDir(path);
  }
}