import { createStore } from "./generic-store";

export enum Overlay {
  DateRangeModal = "DateRangeModal",
}

type OverlayStore = {
  visibleOverlay: Overlay | undefined;
};

export const { useStore: useOverlayStore, setState: setOverlayStore } =
  createStore<OverlayStore>({
    visibleOverlay: undefined,
  });

export const enableOverlay = (overlay: Overlay) => {
  setOverlayStore({ visibleOverlay: overlay });
};

export const closeAllOverlays = () => {
  setOverlayStore({ visibleOverlay: undefined });
};

export const useActiveOverlay = () => {
  const visibleOverlay = useOverlayStore("visibleOverlay");
  return visibleOverlay;
};
