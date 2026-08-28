type Listener<T> = (event: { payload: T }) => void;

const unlistenNoop = () => undefined;

export async function listen<T>(
  _event: string,
  handler: Listener<T>,
): Promise<() => void> {
  void handler;
  return unlistenNoop;
}

export async function emit(_event: string, _payload?: unknown): Promise<void> {
  return undefined;
}
