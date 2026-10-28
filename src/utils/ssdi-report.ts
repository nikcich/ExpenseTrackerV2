import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getActiveService } from "@/services/ServiceProvider";

export type SsdiReportMonth = {
  label: string;
  earned: number;
  twpAmount: number;
  isTwpMonth: boolean;
  dueBenefits: boolean;
};

export type SsdiReportPeriod = {
  employer: string;
  beginDate: string;
  endDate: string;
  depositDate: string;
  depositAmount: number;
  grossEarnings: number;
};

export type SsdiReportYear = {
  year: number;
  sgaAmount: number;
  chartMonths: { label: string; earned: number; deposit: number }[];
  months: SsdiReportMonth[];
  periods: SsdiReportPeriod[];
};

export type SsdiReportData = {
  fromYear: number;
  toYear: number;
  twpCount: number;
  twpLimit: number;
  cessation: string;
  gracePeriodEnd: string;
  isCompliant: boolean;
  years: SsdiReportYear[];
};

type RGB = [number, number, number];

const INK: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const RULE: RGB = [226, 232, 240];
const ACCENT: RGB = [30, 64, 175];
const GROSS: RGB = [59, 130, 246];
const NET: RGB = [148, 163, 184];
const DANGER: RGB = [220, 38, 38];
const OK: RGB = [22, 128, 61];
const STRIPE: RGB = [248, 250, 252];

const MARGIN = 40;

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compactMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(n)}`;

function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function drawChart(
  doc: jsPDF,
  data: SsdiReportYear,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const axisW = 38;
  const legendH = 18;
  const labelH = 16;
  const plotX = x + axisW;
  const plotY = y + legendH;
  const plotW = w - axisW;
  const plotH = h - legendH - labelH;

  const peak = Math.max(
    data.sgaAmount,
    ...data.chartMonths.flatMap((m) => [m.earned, m.deposit]),
  );
  const max = niceMax(peak * 1.05);
  const ticks = 4;
  const scaleY = (v: number) => plotY + plotH - (v / max) * plotH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setLineWidth(0.5);
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const ty = scaleY(v);
    doc.setDrawColor(...RULE);
    doc.line(plotX, ty, plotX + plotW, ty);
    doc.setTextColor(...MUTED);
    doc.text(compactMoney(v), plotX - 5, ty + 2.5, { align: "right" });
  }

  const band = plotW / data.chartMonths.length;
  const barW = Math.min(14, band * 0.32);
  data.chartMonths.forEach((m, i) => {
    const cx = plotX + band * i + band / 2;
    doc.setFillColor(...GROSS);
    if (m.earned > 0) {
      doc.rect(cx - barW - 1, scaleY(m.earned), barW, plotY + plotH - scaleY(m.earned), "F");
    }
    doc.setFillColor(...NET);
    if (m.deposit > 0) {
      doc.rect(cx + 1, scaleY(m.deposit), barW, plotY + plotH - scaleY(m.deposit), "F");
    }
    doc.setTextColor(...MUTED);
    doc.text(m.label.split(" ")[0], cx, plotY + plotH + 11, { align: "center" });
  });

  const sgaY = scaleY(data.sgaAmount);
  doc.setDrawColor(...DANGER);
  doc.setLineWidth(1);
  doc.setLineDashPattern([4, 3], 0);
  doc.line(plotX, sgaY, plotX + plotW, sgaY);
  doc.setLineDashPattern([], 0);
  doc.setTextColor(...DANGER);
  doc.setFont("helvetica", "bold");
  doc.text(`SGA ${money(data.sgaAmount).replace(".00", "")}`, plotX + plotW, sgaY - 3, {
    align: "right",
  });

  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.75);
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

  doc.setFont("helvetica", "normal");
  let lx = plotX;
  const legend: [string, RGB][] = [
    ["Gross Income", GROSS],
    ["Net Income (Deposits)", NET],
  ];
  for (const [label, color] of legend) {
    doc.setFillColor(...color);
    doc.rect(lx, y + 3, 8, 8, "F");
    doc.setTextColor(...INK);
    doc.text(label, lx + 12, y + 10);
    lx += 12 + doc.getTextWidth(label) + 16;
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(text, MARGIN, y);
  return y + 8;
}

const tableStyles = {
  font: "helvetica",
  fontSize: 9,
  textColor: INK,
  cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
  lineColor: RULE,
  lineWidth: 0,
};

const headStyles = {
  fillColor: ACCENT,
  textColor: [255, 255, 255] as RGB,
  fontStyle: "bold" as const,
  fontSize: 8.5,
};

const rangeLabel = (data: SsdiReportData) =>
  data.fromYear === data.toYear ? String(data.fromYear) : `${data.fromYear}\u2013${data.toYear}`;

const lastTableY = (doc: jsPDF) =>
  (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

const sumGross = (y: SsdiReportYear) => y.months.reduce((s, m) => s + m.earned, 0);
const sumDeposits = (y: SsdiReportYear) => y.chartMonths.reduce((s, m) => s + m.deposit, 0);

function drawStats(doc: jsPDF, stats: [string, string, RGB][], y: number, contentW: number): number {
  const cols = 4;
  const colW = contentW / cols;
  stats.forEach(([label, value, color], i) => {
    const sx = MARGIN + (i % cols) * colW;
    const sy = y + Math.floor(i / cols) * 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), sx, sy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(value, sx, sy + 15);
  });
  return y + Math.ceil(stats.length / cols) * 40;
}

function drawYear(
  doc: jsPDF,
  data: SsdiReportData,
  yr: SsdiReportYear,
  startY: number,
  showYearHeading: boolean,
  contentW: number,
) {
  const pageH = doc.internal.pageSize.getHeight();
  let y = startY;

  if (showYearHeading) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(String(yr.year), MARGIN, y + 6);
    y += 24;
    y = drawStats(
      doc,
      [
        ["SGA Threshold", `${money(yr.sgaAmount)} / mo`, INK],
        ["Total Gross Earnings", money(sumGross(yr)), INK],
        ["Total Deposits", money(sumDeposits(yr)), INK],
      ],
      y,
      contentW,
    );
    y += 4;
  }

  y = sectionTitle(doc, "Monthly Earnings Overview", y);
  drawChart(doc, yr, MARGIN, y + 6, contentW, 200);
  y += 6 + 200 + 24;

  y = sectionTitle(doc, "Monthly Earnings", y);
  autoTable(doc, {
    startY: y + 4,
    margin: { left: MARGIN, right: MARGIN, bottom: 50 },
    head: [
      [
        "Month Year",
        "Monthly Earnings",
        "Monthly Trial Work Period Amounts",
        "Trial Work Period Month",
        "Due Benefits",
      ],
    ],
    body:
      yr.months.length > 0
        ? yr.months.map((m) => [
            m.label,
            money(m.earned),
            money(m.twpAmount),
            m.isTwpMonth ? "Yes" : "No",
            m.dueBenefits ? "Yes" : "No",
          ])
        : [["No monthly data for this year", "", "", "", ""]],
    foot:
      yr.months.length > 0
        ? [
            [
              "Total",
              money(sumGross(yr)),
              "",
              `${yr.months.filter((m) => m.isTwpMonth).length} of ${data.twpLimit}`,
              "",
            ],
          ]
        : undefined,
    styles: tableStyles,
    headStyles,
    footStyles: { fillColor: STRIPE, textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (hook) => {
      if (hook.column.index === 1 || hook.column.index === 2) hook.cell.styles.halign = "right";
      if (hook.column.index === 3 || hook.column.index === 4) hook.cell.styles.halign = "center";
    },
  });

  let periodsY = lastTableY(doc) + 28;
  if (periodsY > pageH - 140) {
    doc.addPage();
    periodsY = MARGIN + 10;
  }
  periodsY = sectionTitle(doc, "Pay Periods", periodsY);

  autoTable(doc, {
    startY: periodsY + 4,
    margin: { left: MARGIN, right: MARGIN, bottom: 50 },
    head: [["Employer", "Begin", "End", "Deposit Date", "Deposit", "Gross Earnings"]],
    body:
      yr.periods.length > 0
        ? yr.periods.map((p) => [
            p.employer,
            p.beginDate,
            p.endDate,
            p.depositDate,
            money(p.depositAmount),
            money(p.grossEarnings),
          ])
        : [["No pay periods for this year", "", "", "", "", ""]],
    styles: tableStyles,
    headStyles,
    alternateRowStyles: { fillColor: STRIPE },
    columnStyles: { 0: { cellWidth: 150 } },
    didParseCell: (hook) => {
      if (hook.column.index === 4 || hook.column.index === 5) hook.cell.styles.halign = "right";
    },
  });
}

export function buildSsdiReport(data: SsdiReportData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const multiYear = data.years.length > 1;

  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("SSDI Earnings Report", MARGIN, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Reporting ${multiYear ? "period" : "year"} ${rangeLabel(data)}`, MARGIN, 70);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageW - MARGIN,
    70,
    { align: "right" },
  );
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN, 80, pageW - MARGIN, 80);

  const stats: [string, string, RGB][] = [
    ["TWP Months Used", `${data.twpCount} / ${data.twpLimit}`, INK],
    ["Cessation Month", data.cessation, INK],
    ["Grace Period Ends", data.gracePeriodEnd, INK],
    ["SSA Compliance", data.isCompliant ? "OK" : "NON-COMPLIANT", data.isCompliant ? OK : DANGER],
  ];
  if (!multiYear) {
    const only = data.years[0];
    stats.push(
      ["SGA Threshold", `${money(only.sgaAmount)} / mo`, INK],
      ["Total Gross Earnings", money(sumGross(only)), INK],
      ["Total Deposits", money(sumDeposits(only)), INK],
    );
  }
  const statsEnd = drawStats(doc, stats, 102, contentW);

  if (!multiYear) {
    drawYear(doc, data, data.years[0], statsEnd + 10, false, contentW);
  } else {
    const y = sectionTitle(doc, "Summary by Year", statsEnd + 4);
    autoTable(doc, {
      startY: y + 4,
      margin: { left: MARGIN, right: MARGIN, bottom: 50 },
      head: [["Year", "SGA Threshold", "Gross Earnings", "Deposits", "TWP Months"]],
      body: data.years.map((yr) => [
        String(yr.year),
        money(yr.sgaAmount),
        money(sumGross(yr)),
        money(sumDeposits(yr)),
        String(yr.months.filter((m) => m.isTwpMonth).length),
      ]),
      foot: [
        [
          "Total",
          "",
          money(data.years.reduce((s, yr) => s + sumGross(yr), 0)),
          money(data.years.reduce((s, yr) => s + sumDeposits(yr), 0)),
          String(data.years.reduce((s, yr) => s + yr.months.filter((m) => m.isTwpMonth).length, 0)),
        ],
      ],
      styles: tableStyles,
      headStyles,
      footStyles: { fillColor: STRIPE, textColor: INK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: STRIPE },
      didParseCell: (hook) => {
        if (hook.column.index >= 1 && hook.column.index <= 3) hook.cell.styles.halign = "right";
        if (hook.column.index === 4) hook.cell.styles.halign = "center";
      },
    });

    for (const yr of data.years) {
      doc.addPage();
      drawYear(doc, data, yr, MARGIN + 10, true, contentW);
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, pageH - 36, pageW - MARGIN, pageH - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`SSDI Earnings Report \u2014 ${rangeLabel(data)}`, MARGIN, pageH - 22);
    doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 22, { align: "right" });
  }

  return doc;
}

export async function downloadSsdiReport(data: SsdiReportData): Promise<string | null> {
  const service = getActiveService();
  if (!service) return null;

  const path = await service.saveFileDialog({
    defaultPath: `ssdi-report-${data.fromYear === data.toYear ? data.fromYear : `${data.fromYear}-${data.toYear}`}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return null;

  const bytes = Array.from(new Uint8Array(buildSsdiReport(data).output("arraybuffer")));
  const res = await service.saveBinaryToPath(path, bytes);
  if (res.status >= 400) throw new Error(res.header);
  return path;
}
