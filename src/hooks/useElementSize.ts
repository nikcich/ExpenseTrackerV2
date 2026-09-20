import { useLayoutEffect, useRef, useState, type RefObject } from "react";

type Size = { width: number; height: number };

export function useElementSize<T extends HTMLElement>(
  ref: RefObject<T | null>,
  delay = 90,
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const committed = useRef<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const read = (): Size => {
      const rect = node.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    };

    const commit = (next: Size) => {
      if (
        next.width === committed.current.width &&
        next.height === committed.current.height
      ) {
        return;
      }
      committed.current = next;
      setSize(next);
    };

    commit(read());

    let timer: number | null = null;
    let last = 0;

    const run = () => {
      timer = null;
      last = performance.now();
      commit(read());
    };

    const schedule = () => {
      const elapsed = performance.now() - last;
      if (elapsed >= delay) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        run();
      } else if (timer === null) {
        timer = window.setTimeout(run, delay - elapsed);
      }
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(node);
    return () => {
      ro.disconnect();
      if (timer !== null) clearTimeout(timer);
    };
  }, [ref, delay]);

  return size;
}
