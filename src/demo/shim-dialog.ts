type Filter = { name: string; extensions: string[] };

type OpenOptions = {
  multiple?: boolean;
  directory?: boolean;
  filters?: Filter[];
};

type SaveOptions = {
  defaultPath?: string;
  filters?: Filter[];
};

export async function open(options?: OpenOptions): Promise<string | null> {
  void options;
  return null;
}

export async function save(
  options?: SaveOptions,
): Promise<string | boolean | null> {
  void options;
  return options?.defaultPath ?? "download";
}
