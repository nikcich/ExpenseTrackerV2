import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { debounce } from "lodash";
import { instantBrushRange$ } from "./store";
import { API } from "@/types/types";

export const updateDateRange = debounce(async (start: Date, end: Date) => {
  await invoke(API.SetDateRange, {
    start: start.getTime(),
    end: end.getTime(),
  });

  // Broadcast to all windows
  getCurrentWindow().emit("date-range-changed", {
    start: start.getTime(),
    end: end.getTime(),
  });
}, 300);

listen<{ start: number; end: number }>("date-range-changed", (event) => {
  const { start, end } = event.payload;
  instantBrushRange$.next([start, end]);
});
