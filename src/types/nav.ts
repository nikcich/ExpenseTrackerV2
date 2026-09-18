import type { IconType } from "react-icons";
import { Pages } from "./routes";
import { PiChartPieSlice, PiCompassLight } from "react-icons/pi";
import {
  FaChartBar,
  FaCoins,
  FaExclamationTriangle,
  FaTable,
} from "react-icons/fa";
import { FaChartLine } from "react-icons/fa6";
import {
  LuChartColumnStacked,
  LuFileSpreadsheet,
  LuLayers,
} from "react-icons/lu";
import { MdOutlineTrendingUp } from "react-icons/md";
import { BsAlignMiddle } from "react-icons/bs";
import { TbChartSankey } from "react-icons/tb";
import { RiBarChartHorizontalFill } from "react-icons/ri";
import { HiOutlineDocumentText } from "react-icons/hi2";

export type NavItem = {
  page: Pages;
  label: string;
  icon: IconType;
  conditional?: "rsu" | "ssdi";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ page: Pages.Overview, label: "Overview", icon: PiCompassLight }],
  },
  {
    title: "Tracking",
    items: [
      { page: Pages.TableView, label: "Transactions", icon: FaTable },
      { page: Pages.Accounts, label: "Accounts", icon: PiChartPieSlice },
      { page: Pages.Groups, label: "Groups", icon: LuLayers },
      { page: Pages.Forecast, label: "Forecast", icon: MdOutlineTrendingUp },
      {
        page: Pages.Anomalies,
        label: "Anomalies",
        icon: FaExclamationTriangle,
      },
    ],
  },
  {
    title: "Investments",
    items: [
      { page: Pages.RSU, label: "RSU", icon: FaCoins, conditional: "rsu" },
      { page: Pages.SSDI, label: "SSDI", icon: HiOutlineDocumentText, conditional: "ssdi" },
    ],
  },
  {
    title: "Charts",
    items: [
      { page: Pages.AverageSpending, label: "Average Spending", icon: BsAlignMiddle },
      {
        page: Pages.RangeIncomeExpense,
        label: "Income vs Expenses",
        icon: RiBarChartHorizontalFill,
      },
      { page: Pages.BarChart, label: "Bar Chart", icon: FaChartBar },
      {
        page: Pages.StackedBarChart,
        label: "Stacked Bar Chart",
        icon: LuChartColumnStacked,
      },
      { page: Pages.YTDChart, label: "Year to Date", icon: FaChartLine },
      { page: Pages.Sankey, label: "Sankey", icon: TbChartSankey },
    ],
  },
  {
    title: "Utilities",
    items: [
      { page: Pages.CSVFormats, label: "CSV Formats", icon: LuFileSpreadsheet },
    ],
  },
];

export const NAV_PAGE_ORDER: Pages[] = NAV_SECTIONS.flatMap((section) =>
  section.items.filter((item) => !item.conditional).map((item) => item.page),
);