import { BehaviorSubject } from "rxjs";
import { KnownStoreKeys, type Expense, type PreviewResult, type Response } from "@/types/types";
import { createMockData } from "@/types/mockExpenses";
import type {
  CsvParseResponse,
  ExpenseTrackerService,
  ExportAllDataResponse,
  ImportAllDataResponse,
  OpenFileDialogOptions,
  SaveFileDialogOptions,
  Unsubscribe,
  UpdateCheckResult,
} from "./ExpenseTrackerService";

const ok = <T>(message: T): Response<T> => ({
  status: 200,
  header: "OK",
  message,
});

const error = <T>(header: string, status = 500): Response<T> => ({
  status,
  header,
  message: null,
});

export class MockService implements ExpenseTrackerService {
  private store: Record<string, unknown> = createMockData();
  private changed$ = new BehaviorSubject<string | null>(null);

  private expensesMap(): Record<string, Expense> {
    return this.store[KnownStoreKeys.Expenses] as Record<string, Expense>;
  }

  async getStoreValue<T>(key: string): Promise<Response<T>> {
    const value = this.store[key];
    if (value === undefined) return error(`No mock data for key "${key}"`, 404);
    return ok(value as T);
  }

  async setStoreValue<T>(key: string, value: T): Promise<Response<null>> {
    this.store[key] = value;
    this.changed$.next(key);
    return ok(null);
  }

  onStoreChanged(callback: (key: string) => void): Unsubscribe {
    const subscription = this.changed$.subscribe((key) => {
      if (key !== null) callback(key);
    });
    return () => subscription.unsubscribe();
  }

  async addExpenseManual(expense: Expense): Promise<Response<null>> {
    const expenses = { ...this.expensesMap() };
    expenses[expense.id] = expense;
    this.store[KnownStoreKeys.Expenses] = expenses;
    this.changed$.next(KnownStoreKeys.Expenses);
    return ok(null);
  }

  async updateExpense(hash: string, expense: Expense): Promise<Response<null>> {
    await this.updateBulkExpenses([hash], [expense]);
    return ok(null);
  }

  async updateBulkExpenses(
    hashes: string[],
    expenses: Expense[],
  ): Promise<Response<null>> {
    const map = { ...this.expensesMap() };
    for (let i = 0; i < hashes.length; i++) {
      if (hashes[i] in map) map[hashes[i]] = expenses[i];
    }
    this.store[KnownStoreKeys.Expenses] = map;
    this.changed$.next(KnownStoreKeys.Expenses);
    return ok(null);
  }

  async removeExpense(hash: string): Promise<Response<null>> {
    await this.removeBulkExpenses([hash]);
    return ok(null);
  }

  async removeBulkExpenses(hashes: string[]): Promise<Response<null>> {
    const map = { ...this.expensesMap() };
    for (const hash of hashes) {
      delete map[hash];
    }
    this.store[KnownStoreKeys.Expenses] = map;
    this.changed$.next(KnownStoreKeys.Expenses);
    return ok(null);
  }

  async openCsvFromPath(
    _file: string,
    _customDefinitionsJson?: string | null,
  ): Promise<Response<string[]>> {
    return error("CSV import is not available in mock mode");
  }

  async parseCsvFromPath(
    _path: string,
    _csvDefinitionKey: string,
    _customDefinitionsJson?: string | null,
  ): Promise<Response<CsvParseResponse>> {
    return error("CSV import is not available in mock mode");
  }

  async saveCsvToPath(_path: string, _content: string): Promise<Response<string>> {
    return error("File saving is not available in mock mode");
  }

  async readTextFile(_path: string): Promise<Response<string>> {
    return error("File reading is not available in mock mode");
  }

  async readCsvPreview(_path: string, _rows: number): Promise<Response<string[][]>> {
    return error("CSV preview is not available in mock mode");
  }

  async previewCsvParse(
    _path: string,
    _definitionJson: string,
  ): Promise<Response<PreviewResult[]>> {
    return error("CSV preview is not available in mock mode");
  }

  async exportAllData(): Promise<Response<ExportAllDataResponse>> {
    return ok({ version: 1, data: this.store as Record<string, unknown> });
  }

  async importAllData(
    data: Record<string, unknown>,
  ): Promise<Response<ImportAllDataResponse>> {
    const importedKeys: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      this.store[key] = value;
      importedKeys.push(key);
      this.changed$.next(key);
    }
    return ok({ imported_keys: importedKeys });
  }

  async openFileDialog(_options?: OpenFileDialogOptions): Promise<string[] | string | null> {
    return null;
  }

  async saveFileDialog(_options?: SaveFileDialogOptions): Promise<string | null> {
    return null;
  }

  async revealItemInDir(_path: string): Promise<void> {}

  async getAppVersion(): Promise<string> {
    return __APP_VERSION__;
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    return { updateAvailable: false, currentVersion: __APP_VERSION__ };
  }

  async installUpdate(): Promise<void> {
    throw new Error("No update available");
  }
}