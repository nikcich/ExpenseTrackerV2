import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./Sankey.module.scss";
import {
  useChartTooltip,
  ChartTooltip,
  formatTooltipMoney,
  TooltipTitle,
  TooltipRow,
} from "@/components/charts/ChartTooltip";

export type SankeyNode = {
  id: string;
  label: string;
  color?: string;
  x?: number;
  y?: number;
};

export type SankeyLink = {
  source: string; // node id
  target: string; // node id
  value: number;
  color?: string;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};

type SankeyProps = {
  data: SankeyData;
};

const NODE_THICKNESS = 16;
const NODE_GAP = 0.015;
const BAND = 0.96;
const PORT_GAP = 2;
const TERMINAL_GAP = 0.03;

type PositionedNode = SankeyNode & {
  col: number;
  value: number;
};

export const Sankey = ({ data }: SankeyProps) => {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { containerRef, tip, show, hide } = useChartTooltip();

  useLayoutEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const margin = { top: 30, right: 10, bottom: 30, left: 10 };
  const { width, height } = size;

  return (
    <div className={styles.container}>
      <div className={styles.plotContainer} ref={(el) => { plotRef.current = el; containerRef.current = el; }}>
        {width > 0 && height > 0 && (
          <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`}>
            <Diagram
              data={data}
              width={width}
              height={height}
              margin={margin}
              onShow={show}
              onHide={hide}
            />
          </svg>
        )}
        <ChartTooltip tip={tip} />
      </div>
    </div>
  );
};

function Diagram({
  data,
  width,
  height,
  margin,
  onShow,
  onHide,
}: {
  data: SankeyData;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  onShow: (px: number, py: number, content: ReactNode) => void;
  onHide: () => void;
}) {
  const plotX = margin.left;
  const plotY = margin.top;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const positioned = useMemo(() => positionNodes(data), [data]);

  const byCol = useMemo(() => {
    const map = new Map<number, PositionedNode[]>();
    for (const n of positioned) {
      const arr = map.get(n.col) ?? [];
      arr.push(n);
      map.set(n.col, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
    }
    return map;
  }, [positioned]);

  const scaleByCol = useMemo(() => computeScaleByCol(byCol), [byCol]);

  const pnodes = useMemo(
    () =>
      positioned.map((n) => {
        const val = Math.max(0, n.value);
        const cx = n.col;
        const h = val * (scaleByCol.get(cx) ?? 0);
        const cy = n.y ?? 0.5;
        const top = cy - h / 2;
        const x = plotX + cx * plotW - NODE_THICKNESS;
        const y = plotY + top * plotH;
        const px = plotX + cx * plotW;
        const left = plotY + top * plotH;
        const right = left + h * plotH;
        return {
          id: n.id,
          col: cx,
          label: n.label,
          color: n.color,
          value: val,
          x: Math.round(x),
          y: Math.round(y),
          w: NODE_THICKNESS,
          h: Math.round(h * plotH),
          px: Math.round(px),
          bandLeft: left,
          bandRight: right,
        };
      }),
    [positioned, scaleByCol, plotX, plotW, plotH, plotY]
  );

  const byId = useMemo(
    () => new Map(pnodes.map((n) => [n.id, n])),
    [pnodes]
  );

  const linkPorts = useMemo(
    () => computePorts(pnodes, data.links),
    [pnodes, data.links]
  );

  return (
    <>
      {data.links.map((link, i) => {
        const src = byId.get(link.source);
        const tgt = byId.get(link.target);
        const port = linkPorts[i];
        if (!src || !tgt || !port) return null;
        const dx = Math.max(20, (tgt.px - src.px) / 2);
        const path = ribbonPath(
          src.px,
          port.ys,
          tgt.px,
          port.yt,
          dx,
          port.hs,
          port.ht
        );
        return (
          <path
            key={i}
            d={path}
            fill={link.color ?? "rgba(255,255,255,0.18)"}
            stroke="none"
            onMouseMove={(e) =>
              onShow(e.clientX, e.clientY, (
                <>
                  <TooltipTitle>
                    {src.label} → {tgt.label}
                  </TooltipTitle>
                  <TooltipRow
                    color={src.color}
                    label="Flow"
                    value={formatTooltipMoney(link.value)}
                  />
                </>
              ))
            }
            onMouseLeave={onHide}
          />
        );
      })}

      {pnodes.map((n) => {
        const isRightColumn =
          n.col === Math.max(...pnodes.map((p) => p.col));
        const labelX = isRightColumn ? n.x - 8 : n.px + 8;
        return (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={2}
              fill={n.color ?? "#ccc"}
              onMouseMove={(e) =>
                onShow(e.clientX, e.clientY, (
                  <>
                    <TooltipTitle>{n.label}</TooltipTitle>
                    <TooltipRow
                      color={n.color}
                      label="Total"
                      value={formatTooltipMoney(n.value)}
                    />
                  </>
                ))
              }
              onMouseLeave={onHide}
            />
            <text
              x={labelX}
              y={n.y + n.h / 2 + 3}
              fontSize={11}
              fill="#ffffff"
              textAnchor={isRightColumn ? "end" : "start"}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function positionNodes(data: SankeyData): PositionedNode[] {
  const withValues = data.nodes.map((n) => ({
    ...n,
    col: n.x ?? 0,
    value: linkValue(data.links, n.id),
  }));

  const explicit =
    data.nodes.length > 0 &&
    data.nodes.every((n) => n.x !== undefined && n.y !== undefined);

  if (explicit) return withValues;

  const columns = new Map<number, SankeyNode[]>();
  for (const n of data.nodes) {
    const col = n.x ?? 0;
    const arr = columns.get(col) ?? [];
    arr.push(n);
    columns.set(col, arr);
  }
  const sortedCols = [...columns.keys()].sort((a, b) => a - b);

  for (const col of sortedCols) {
    const nodes = withValues.filter((n) => n.col === col);
    const total = nodes.reduce((s, n) => s + Math.max(0, n.value), 0);
    const gap = (1 - BAND) / Math.max(1, nodes.length - 1) || 0;
    const nodeTotal = total + gap * (nodes.length - 1);
    let cursor = (1 - nodeTotal) / 2;
    for (const n of nodes) {
      if (total <= 0) {
        n.y = 0.5;
      } else {
        const h = n.value / total;
        n.y = cursor + h / 2;
        cursor += h + gap;
      }
    }
  }

  return withValues;
}

function linkValue(links: SankeyLink[], id: string): number {
  return links
    .filter((l) => l.source === id || l.target === id)
    .reduce((s, l) => s + l.value, 0);
}

function computeScaleByCol(
  byCol: Map<number, PositionedNode[]>
): Map<number, number> {
  const maxCol = Math.max(...byCol.keys(), 0);
  const out = new Map<number, number>();
  for (const [col, arr] of byCol.entries()) {
    const total = arr.reduce((s, n) => s + Math.max(0, n.value), 0);
    if (arr.length === 0 || total <= 0) {
      out.set(col, 0);
      continue;
    }
    const gap = col === maxCol ? TERMINAL_GAP : NODE_GAP;
    out.set(col, (BAND - gap * (arr.length - 1)) / total);
  }
  return out;
}

type Port = {
  ys: number;
  yt: number;
  hs: number;
  ht: number;
};

type PortNode = {
  id: string;
  bandLeft: number;
  bandRight: number;
};

function computePorts(nodes: PortNode[], links: SankeyLink[]): (Port | null)[] {
  const outByNode = new Map<string, { link: SankeyLink; idx: number }[]>();
  const inByNode = new Map<string, { link: SankeyLink; idx: number }[]>();
  links.forEach((link, idx) => {
    const out = outByNode.get(link.source) ?? [];
    out.push({ link, idx });
    outByNode.set(link.source, out);
    const inn = inByNode.get(link.target) ?? [];
    inn.push({ link, idx });
    inByNode.set(link.target, inn);
  });

  const outPorts = new Map<number, number[]>();
  const inPorts = new Map<number, number[]>();

  const stack = (
    map: Map<string, { link: SankeyLink; idx: number }[]>,
    ports: Map<number, number[]>
  ) => {
    for (const [id, list] of map.entries()) {
      const node = nodes.find((n) => n.id === id);
      if (!node || list.length === 0) continue;
      const total = list.reduce((s, e) => s + Math.max(0, e.link.value), 0);
      const span = node.bandRight - node.bandLeft;
      const gapTotal = PORT_GAP * (list.length - 1);
      const usable = Math.max(0, span - gapTotal);
      let cursor = node.bandLeft;
      for (const { idx, link } of list) {
        const h =
          total > 0
            ? (Math.max(0, link.value) / total) * usable
            : usable / list.length;
        ports.set(idx, [cursor, cursor + h]);
        cursor += h + PORT_GAP;
      }
    }
  };

  stack(outByNode, outPorts);
  stack(inByNode, inPorts);

  return links.map((_, idx) => {
    const out = outPorts.get(idx);
    const inn = inPorts.get(idx);
    if (!out || !inn) return null;
    return {
      ys: out[0],
      yt: inn[0],
      hs: out[1] - out[0],
      ht: inn[1] - inn[0],
    };
  });
}

function ribbonPath(
  sx: number,
  ys: number,
  tx: number,
  yt: number,
  dx: number,
  hs: number,
  ht: number
): string {
  const sy0 = ys;
  const sy1 = ys + hs;
  const ty0 = yt;
  const ty1 = yt + ht;
  return [
    `M ${sx} ${sy0}`,
    `C ${sx + dx} ${sy0}, ${tx - dx} ${ty0}, ${tx} ${ty0}`,
    `L ${tx} ${ty1}`,
    `C ${tx - dx} ${ty1}, ${sx + dx} ${sy1}, ${sx} ${sy1}`,
    "Z",
  ].join(" ");
}
