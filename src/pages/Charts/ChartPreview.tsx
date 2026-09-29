import { ChartWidgetType } from "@/store/ChartsStore";

const EXPENSES = "#bb0000";
const INCOME = "#00a100";
const SAVINGS = "#ffd000";
const SANKEY_GREY = "#8a8a8a";

type Segment = { color: string; height: number };

const AVG_TOWERS: Segment[][] = [
  [
    { color: "#F59E0B", height: 8 },
    { color: "#06B6D4", height: 5 },
    { color: "#6366F1", height: 7 },
    { color: "#10B981", height: 4 },
    { color: "#8B5CF6", height: 6 },
    { color: "#EC4899", height: 3 },
  ],
];

const TAG_TOWERS: Segment[][] = [
  [
    { color: "#F59E0B", height: 13 },
    { color: "#8B5CF6", height: 9 },
  ],
  [
    { color: "#6366F1", height: 9 },
    { color: "#EC4899", height: 15 },
  ],
  [
    { color: "#06B6D4", height: 11 },
    { color: "#F59E0B", height: 10 },
    { color: "#10B981", height: 6 },
  ],
  [
    { color: "#8B5CF6", height: 17 },
    { color: "#6366F1", height: 7 },
  ],
  [
    { color: "#10B981", height: 13 },
    { color: "#06B6D4", height: 9 },
  ],
  [
    { color: "#F59E0B", height: 9 },
    { color: "#EC4899", height: 12 },
    { color: "#8B5CF6", height: 5 },
  ],
];

const StackedColumns = ({
  towers,
  barWidth = 14,
}: {
  towers: Segment[][];
  barWidth?: number;
}) => {
  const gap = 6;
  const total = towers.length * barWidth + (towers.length - 1) * gap;
  const startX = (120 - total) / 2;
  return (
    <svg viewBox="0 0 120 48" aria-hidden>
      {towers.map((segments, i) => {
        let y = 44;
        return segments.map((seg, j) => {
          const rect = (
            <rect
              key={`${i}-${j}`}
              x={startX + i * (barWidth + gap)}
              y={y - seg.height}
              width={barWidth}
              height={seg.height}
             
              fill={seg.color}
            />
          );
          y -= seg.height;
          return rect;
        });
      })}
    </svg>
  );
};

const IncomeVsExpenses = () => (
  <svg viewBox="0 0 120 48" aria-hidden>
    <rect x="4" y="6" width="86" height="9" fill={EXPENSES} />
    <rect x="4" y="19" width="104" height="9" fill={INCOME} />
    <rect x="4" y="32" width="58" height="9" fill={SAVINGS} />
  </svg>
);

const DateGrouped = () => (
  <svg viewBox="0 0 120 48" aria-hidden>
    {[26, 15, 8, 17, 26, 10, 30, 13, 6, 22, 21, 9, 28, 11, 13, 15, 24, 7].map(
      (h, i) => {
        const colors = [EXPENSES, INCOME, SAVINGS];
        return (
          <rect
            key={i}
            x={6 + (i % 3) * 5 + Math.floor(i / 3) * 19}
            y={44 - h}
            width="3.4"
            height={h}
            fill={colors[i % 3]}
          />
        );
      }
    )}
  </svg>
);

const YearToDate = () => (
  <svg viewBox="0 0 120 48" aria-hidden>
    <polyline
      points="6,40 40,36 74,28 108,20"
      fill="none"
      stroke={EXPENSES}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="6,45 40,33 74,18 108,5"
      fill="none"
      stroke={INCOME}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="6,43 40,39 74,32 108,25"
      fill="none"
      stroke={SAVINGS}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Sankey = () => (
  <svg viewBox="0 0 120 48" aria-hidden>
    <rect x="6" y="16" width="10" height="18" fill={INCOME} />
    <rect x="104" y="6" width="10" height="18" fill={EXPENSES} />
    <rect x="104" y="28" width="10" height="12" fill={SAVINGS} />
    <path
      d="M 16,19 C 54,19 72,10 104,10 L 104,21 C 72,21 54,28 16,28 Z"
      fill={SANKEY_GREY}
      fillOpacity="0.55"
    />
    <path
      d="M 16,24 C 54,24 72,30 104,30 L 104,38 C 72,38 54,32 16,32 Z"
      fill={SANKEY_GREY}
      fillOpacity="0.75"
    />
  </svg>
);

export const ChartPreview = ({ type }: { type: ChartWidgetType }) => {
  switch (type) {
    case "average-spending":
      return <StackedColumns towers={AVG_TOWERS} barWidth={40} />;
    case "income-vs-expenses":
      return <IncomeVsExpenses />;
    case "date-grouped":
      return <DateGrouped />;
    case "tag-stacked":
      return <StackedColumns towers={TAG_TOWERS} />;
    case "year-to-date":
      return <YearToDate />;
    case "sankey":
      return <Sankey />;
  }
};