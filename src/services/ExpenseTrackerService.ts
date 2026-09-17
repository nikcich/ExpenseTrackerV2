import type { Expense, PreviewResult, Response } from "@/types/types";

export type Unsubscribe = () => void;

export type FileDialogFilter = {
  name: string;
  extensions: string[];
};

export type OpenFileDialogOptions = {
  multiple?: boolean;
  directory?: boolean;
  filters?: FileDialogFilter[];
};

export type SaveFileDialogOptions = {
  defaultPath?: string;
  filters?: FileDialogFilter[];
};

export type CsvParseResponse = {
  message: string;
  importDate: string;
};

export type ExportAllDataResponse = {
  version: number;
  data: Record<string, unknown>;
};

export type ImportAllDataResponse = {
  imported_keys: string[];
};

export interface ExpenseTrackerService {
  getStoreValue<T>(key: string): Promise<Response<T>>;
  setStoreValue<T>(key: string, value: T): Promise<Response<null>>;
  onStoreChanged(callback: (key: string) => void): Unsubscribe;

  addExpenseManual(expense: Expense): Promise<Response<null>>;
  updateExpense(hash: string, expense: Expense): Promise<Response<null>>;
  updateBulkExpenses(
    hashes: string[],
    expenses: Expense[],
  ): Promise<Response<null>>;
  removeExpense(hash: string): Promise<Response<null>>;
  removeBulkExpenses(hashes: string[]): Promise<Response<null>>;

  openCsvFromPath(
    file: string,
    customDefinitionsJson?: string | null,
  ): Promise<Response<string[]>>;
  parseCsvFromPath(
    path: string,
    csvDefinitionKey: string,
    customDefinitionsJson?: string | null,
  ): Promise<Response<CsvParseResponse>>;
  saveCsvToPath(path: string, content: string): Promise<Response<string>>;
  readTextFile(path: string): Promise<Response<string>>;
  readCsvPreview(path: string, rows: number): Promise<Response<string[][]>>;
  previewCsvParse(
    path: string,
    definitionJson: string,
  ): Promise<Response<PreviewResult[]>>;
  exportAllData(): Promise<Response<ExportAllDataResponse>>;
  importAllData(
    data: Record<string, unknown>,
  ): Promise<Response<ImportAllDataResponse>>;

  openFileDialog(options?: OpenFileDialogOptions): Promise<string | string[] | null>;
  saveFileDialog(options?: SaveFileDialogOptions): Promise<string | null>;
  revealItemInDir(path: string): Promise<void>;
}