import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { updateDateRange } from "@/store/RustInterfaceHandlers";
import { instantBrushRange$ } from "@/store/store";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { useExpenses, useIncome } from "@/hooks/expenses";

interface BrushScrubberProps {
  height?: number;
}

const fractionStart = 0.75;
const fractionEnd = 1;

export const BrushScrubber: React.FC<BrushScrubberProps> = ({
  height = 50,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);

  const expenses = useExpenses();
  const income = useIncome();

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      setWidth(entry.contentRect.width);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 5, right: 10, bottom: 5, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const dates = expenses.map((e) => new Date(e.date));
    const incomeDates = income.map((e) => new Date(e.date));

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, innerWidth])
      .nice();

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

    const expenseY = innerHeight * 0.7;
    const incomeY = innerHeight * 0.3;

    const expensesGroup = container.append("g").attr("class", "expenses");
    expensesGroup
      .selectAll("circle")
      .data(dates)
      .join("circle")
      .attr("cx", (d) => xScale(d))
      .attr("cy", expenseY)
      .attr("r", 2)
      .attr("fill", "red");

    const incomeGroup = container.append("g").attr("class", "income");
    incomeGroup
      .selectAll("circle")
      .data(incomeDates)
      .join("circle")
      .attr("cx", (d) => xScale(d))
      .attr("cy", () => incomeY)
      .attr("r", 2)
      .attr("fill", "green");

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on("brush end", ({ selection }) => {
        if (!selection) return;
        const [x0, x1] = selection;
        const start = xScale.invert(x0);
        const end = xScale.invert(x1);
        const st = start.getTime();
        const en = end.getTime();

        const current = instantBrushRange$.getValue();
        if (current && current[0] === st && current[1] === en) return;

        instantBrushRange$.next([st, en]);
        updateDateRange(start, end);
      });

    const brushG = container.append("g").call(brush);

    const updateBrush = (range: [number, number]) => {
      brushG.call(brush.move as any, [
        xScale(new Date(range[0])),
        xScale(new Date(range[1])),
      ]);
    };

    const currentBrushRange = instantBrushRange$.getValue();

    if (currentBrushRange) {
      updateBrush(currentBrushRange);
    } else {
      const [domainStart, domainEnd] = xScale.domain();
      updateBrush([
        domainStart.getTime() +
          (domainEnd.getTime() - domainStart.getTime()) * fractionStart,
        domainStart.getTime() +
          (domainEnd.getTime() - domainStart.getTime()) * fractionEnd,
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
  }, [expenses, income, width, height]);

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
};
