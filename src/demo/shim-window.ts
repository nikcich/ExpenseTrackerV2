type LogicalSize = { width: number; height: number };

export function getCurrentWindow() {
  return {
    minimize: async () => undefined,
    maximize: async () => undefined,
    unmaximize: async () => undefined,
    toggleMaximize: async () => undefined,
    isMaximized: async () => false,
    isMinimized: async () => false,
    close: async () => undefined,
    startDragging: async () => undefined,
    setSize: async (_size: LogicalSize) => undefined,
    setPosition: async (_pos: { x: number; y: number }) => undefined,
    setTitle: async (_title: string) => undefined,
    show: async () => undefined,
    hide: async () => undefined,
    setFocus: async () => undefined,
    emit: async (_event: string, _payload?: unknown) => undefined,
    on: async () => () => undefined,
    onCloseRequested: async () => () => undefined,
    onResized: async () => () => undefined,
    innerSize: async () => ({ width: 0, height: 0 }),
    outerSize: async () => ({ width: 0, height: 0 }),
    scaleFactor: async () => 1,
  };
}
