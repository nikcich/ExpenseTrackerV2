import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { updateDateRange } from "@/store/RustInterfaceHandlers";
import { instantBrushRange$, useImportHistory } from "@/store/store";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { useExpenses, useIncome, useSavings } from "@/hooks/expenses";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { FiChevronLeft, FiChevronRight, FiMaximize } from "react-icons/fi";

interface BrushScrubberProps {
  height?: number;
}

const fractionStart = 0.75;
const fractionEnd = 1;
const ZOOM_FACTOR = 1.25;
const MIN_ZOOM_DAYS = 14;
const PAN_FRACTION = 0.3;

function getISOWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: "var(--fg-default, #ccc)",
  cursor: "pointer",
  // flexShrink: 0,
  // alignSelf: "stretch",
  transition: "opacity 0.15s",
  height: "60px",
};

const zoomPill: React.CSSProperties = {
  position: "absolute",
  top: 6,
  right: 12,
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 6,
  border: "1px solid var(--border-color, #32323c)",
  background: "var(--bg-panel, #19191e)",
  color: "var(--fg-default, #ccc)",
  fontSize: 11,
  cursor: "pointer",
  userSelect: "none",
};

export const BrushScrubber: React.FC<BrushScrubberProps> = ({
  height = 100,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewDomainRef = useRef<[Date, Date] | null>(null);
  const [viewDomain, setViewDomain] = useState<[Date, Date] | null>(null);
  const [tick, setTick] = useState(0);

  const expenses = useExpenses();
  const income = useIncome();
  const savings = useSavings();
  const { importHistory } = useImportHistory();

  useEffect(() => {
    viewDomainRef.current = viewDomain;
  }, [viewDomain]);

  const snappedExtent = useMemo(() => {
    const dates = expenses.map((e) => new Date(e.date));
    const incomeDates = income.map((e) => new Date(e.date));
    const savingsDates = savings.map((s) => new Date(s.date));
    const allDates = [...dates, ...incomeDates, ...savingsDates];
    if (allDates.length === 0) return null;
    const rawExtent = d3.extent(allDates) as [Date, Date];
    return [
      d3.timeMonth.floor(rawExtent[0]),
      d3.timeMonth.ceil(rawExtent[1]),
    ] as [Date, Date];
  }, [expenses, income, savings]);

  useEffect(() => {
    if (!svgRef.current) return;

    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(svgRef.current);
    return () => ro.disconnect();
  }, []);

  const width = useMemo(() => {
    if (!svgRef.current) return 0;
    return svgRef.current.clientWidth;
  }, [tick]);

  const isZoomed = viewDomain !== null;
  const zoomLevel = useMemo(() => {
    if (!viewDomain || !snappedExtent) return 1;
    const fullMs = snappedExtent[1].getTime() - snappedExtent[0].getTime();
    const viewMs = viewDomain[1].getTime() - viewDomain[0].getTime();
    return fullMs / viewMs;
  }, [viewDomain, snappedExtent]);

  const zoom = useCallback(
    (cursorX: number, zoomIn: boolean) => {
      if (!snappedExtent || width === 0) return;

      const margin = { left: 10, right: 10 };
      const innerWidth = width - margin.left - margin.right;
      const currentDomain = viewDomainRef.current ?? snappedExtent;
      const scale = d3.scaleTime().domain(currentDomain).range([0, innerWidth]);
      const cursorDate = scale.invert(cursorX);

      const fullMs = snappedExtent[1].getTime() - snappedExtent[0].getTime();
      const currentMs = currentDomain[1].getTime() - currentDomain[0].getTime();
      const newMs = zoomIn ? currentMs / ZOOM_FACTOR : currentMs * ZOOM_FACTOR;

      if (newMs > fullMs) {
        setViewDomain(null);
        return;
      }
      if (newMs / (1000 * 60 * 60 * 24) < MIN_ZOOM_DAYS) return;

      const cursorFrac =
        (cursorDate.getTime() - currentDomain[0].getTime()) / currentMs;
      let newStart = cursorDate.getTime() - newMs * cursorFrac;
      let newEnd = cursorDate.getTime() + newMs * (1 - cursorFrac);

      if (newStart < snappedExtent[0].getTime()) {
        newStart = snappedExtent[0].getTime();
        newEnd = newStart + newMs;
      }
      if (newEnd > snappedExtent[1].getTime()) {
        newEnd = snappedExtent[1].getTime();
        newStart = newEnd - newMs;
      }

      setViewDomain([new Date(newStart), new Date(newEnd)]);
    },
    [snappedExtent, width]
  );

  const pan = useCallback(
    (direction: -1 | 1) => {
      if (!viewDomainRef.current || !snappedExtent) return;

      const [dStart, dEnd] = viewDomainRef.current;
      const panMs =
        (dEnd.getTime() - dStart.getTime()) * PAN_FRACTION * direction;
      let newStart = dStart.getTime() + panMs;
      let newEnd = dEnd.getTime() + panMs;
      const span = dEnd.getTime() - dStart.getTime();

      if (newStart < snappedExtent[0].getTime()) {
        newStart = snappedExtent[0].getTime();
        newEnd = newStart + span;
      }
      if (newEnd > snappedExtent[1].getTime()) {
        newEnd = snappedExtent[1].getTime();
        newStart = newEnd - span;
      }

      setViewDomain([new Date(newStart), new Date(newEnd)]);
    },
    [snappedExtent]
  );

  const resetZoom = useCallback(() => setViewDomain(null), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width === 0) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const margin = { left: 10 };
      const cursorX = e.clientX - rect.left - margin.left;
      zoom(cursorX, e.deltaY < 0);
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [width, zoom]);

  useEffect(() => {
    if (!svgRef.current || width === 0 || !snappedExtent) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 5, right: 10, bottom: 45, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const domain = viewDomain ?? snappedExtent;
    const xScale = d3.scaleTime().domain(domain).range([0, innerWidth]);

    const [domainStart, domainEnd] = xScale.domain();

    const allMonths = d3.timeMonth.range(
      d3.timeMonth.floor(domainStart),
      d3.timeMonth.ceil(domainEnd)
    );

    const maxTicks = 12;
    const step = Math.max(1, Math.ceil(allMonths.length / maxTicks));
    const months = allMonths.filter((_, i) => i % step === 0);

    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    container
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", innerHeight / 2)
      .attr("y2", innerHeight / 2)
      .attr("stroke", "#858585ff")
      .attr("stroke-width", 1);

    const dates = expenses.map((e) => new Date(e.date));
    const incomeDates = income.map((e) => new Date(e.date));
    const savingsDates = savings.map((s) => new Date(s.date));

    const importDates = (() => {
      const raw = importHistory ?? [];
      const weekMap = new Map<number, string>();
      for (const d of raw) {
        const date = new Date(d);
        const weekKey = getISOWeekStart(date).getTime();
        const existing = weekMap.get(weekKey);
        if (!existing || date > new Date(existing)) {
          weekMap.set(weekKey, d);
        }
      }
      return [...weekMap.values()];
    })();

    if (importDates.length > 0) {
      const importGroup = container.append("g").attr("class", "import-lines");
      importGroup
        .selectAll("line")
        .data(importDates)
        .join("line")
        .attr("x1", (d) => xScale(new Date(d)))
        .attr("x2", (d) => xScale(new Date(d)))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "rgba(155, 89, 182, 0.5)")
        .attr("stroke-width", 1.5);
    }

    container
      .append("g")
      .attr("class", "month-labels")
      .selectAll("text")
      .data(months)
      .join("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(innerHeight + 20))
      .attr("y", (d) => xScale(d) + 3)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text((d) => d3.timeFormat("%b %y")(d));

    container
      .append("g")
      .attr("class", "month-lines")
      .selectAll("line")
      .data(months)
      .join("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#bababa")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2");

    const expenseY = innerHeight * 0.7;
    const savingsY = innerHeight * 0.5;
    const incomeY = innerHeight * 0.3;

    container
      .append("g")
      .attr("class", "expenses")
      .selectAll("circle")
      .data(dates)
      .join("circle")
      .attr("cx", (d) => xScale(d))
      .attr("cy", expenseY)
      .attr("r", 2)
      .attr("fill", "red");

    container
      .append("g")
      .attr("class", "savings")
      .selectAll("circle")
      .data(savingsDates)
      .join("circle")
      .attr("cx", (d) => xScale(d))
      .attr("cy", savingsY)
      .attr("r", 2)
      .attr("fill", "#ffd000ff");

    container
      .append("g")
      .attr("class", "income")
      .selectAll("circle")
      .data(incomeDates)
      .join("circle")
      .attr("cx", (d) => xScale(d))
      .attr("cy", incomeY)
      .attr("r", 2)
      .attr("fill", "green");

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on("start end", ({ selection }) => {
        if (!selection) return;

        const [x0, x1] = selection;
        const start = xScale.invert(x0);
        const end = xScale.invert(x1);
        const st = start.getTime();
        const en = end.getTime();

        const current = instantBrushRange$.getValue();
        if (current && current[0] === st && current[1] === en) return;

        const rangeDiff = Math.abs((en - st) / (1000 * 60 * 60 * 24));
        if (rangeDiff < 1) return;

        if (!Number.isNaN(st) && !Number.isNaN(en)) {
          instantBrushRange$.next([st, en]);
          updateDateRange(start, end);
        }
      });

    const brushG = container
      .append("g")
      .call(brush)
      .on("dblclick", () => {
        enableOverlay(Overlay.DateRangeModal);
      });

    const updateBrush = (range: [number, number]) => {
      if (!Number.isNaN(range[0]) && !Number.isNaN(range[1])) {
        brushG.call(brush.move as any, [
          xScale(new Date(range[0])),
          xScale(new Date(range[1])),
        ]);
      }
    };

    const currentBrushRange = instantBrushRange$.getValue();

    if (currentBrushRange) {
      updateBrush(currentBrushRange);
    } else {
      const [ds, de] = xScale.domain();
      updateBrush([
        ds.getTime() + (de.getTime() - ds.getTime()) * fractionStart,
        ds.getTime() + (de.getTime() - ds.getTime()) * fractionEnd,
      ]);
    }

    const sub = instantBrushRange$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr) return false;
          return prev[0] === curr[0] && prev[1] === curr[1];
        })
      )
      .subscribe((range) => {
        if (range) updateBrush(range);
      });

    return () => sub.unsubscribe();
  }, [expenses, income, savings, importHistory, width, height, viewDomain, snappedExtent]);

  return (
    <div
      style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 4 }}
    >
      <button
        style={{ ...btnBase, opacity: isZoomed ? 1 : 0.25 }}
        onClick={() => pan(-1)}
        disabled={!isZoomed}
        aria-label="Pan left"
      >
        <FiChevronLeft size={18} style={{ transform: "scaleY(1.6)" }} />
      </button>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <svg
          ref={svgRef}
          height={height}
          style={{ width: "100%", display: "block", cursor: "pointer" }}
        />
        {isZoomed && (
          <div style={zoomPill} onClick={resetZoom} title="Reset zoom">
            <FiMaximize size={10} />
            {zoomLevel.toFixed(1)}x
          </div>
        )}
      </div>
      <button
        style={{ ...btnBase, opacity: isZoomed ? 1 : 0.25 }}
        onClick={() => pan(1)}
        disabled={!isZoomed}
        aria-label="Pan right"
      >
        <FiChevronRight size={18} style={{ transform: "scaleY(1.6)" }} />
      </button>
    </div>
  );
};
