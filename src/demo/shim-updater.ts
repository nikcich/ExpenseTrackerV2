type Update = {
  version: string;
  body?: string;
  downloadAndInstall: () => Promise<void>;
};

export async function check(): Promise<Update | null> {
  return null;
}