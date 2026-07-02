import React from "react";
import styles from "./SideNav.module.scss";
import { AiOutlineHome } from "react-icons/ai";
import { Pages } from "../../types/routes";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { FaTable } from "react-icons/fa6";
import { FaChartBar } from "react-icons/fa";
import { LuChartColumnStacked } from "react-icons/lu";
import { FaSlidersH } from "react-icons/fa";
import { PiFileCsvBold } from "react-icons/pi";
import { RiBarChartHorizontalFill } from "react-icons/ri";
import { FaChartLine } from "react-icons/fa6";
import { BsAlignMiddle } from "react-icons/bs";
import { TbChartSankey } from "react-icons/tb";
import { MdOutlineTrendingUp } from "react-icons/md";
import { PiCompassLight, PiChartPieSlice } from "react-icons/pi";
import { Tooltip } from "@/components/ui/tooltip";

const NavButton = ({ Icon, page, label }: { Icon: React.FC; page: string; label: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Tooltip content={label} positioning={{ placement: "right" }}>
      <button
        className={cx(
          styles.navButton,
          location.pathname === page ? styles.active : ""
        )}
        onClick={() => navigate(page)}
      >
        <Icon />
      </button>
    </Tooltip>
  );
};

export function SideNav() {
  return (
    <div className={styles.navContainer}>
      <NavButton Icon={AiOutlineHome} page={Pages.Home} label="Home" />
      <NavButton Icon={FaSlidersH} page={Pages.Settings} label="Settings" />
      <NavButton Icon={PiFileCsvBold} page={Pages.FileOpener} label="Import CSV" />
      <NavButton Icon={PiCompassLight} page={Pages.Overview} label="Overview" />
      <NavButton Icon={PiChartPieSlice} page={Pages.Investments} label="Investments" />
      <NavButton Icon={MdOutlineTrendingUp} page={Pages.Forecast} label="Forecast" />
      <NavButton Icon={FaTable} page={Pages.TableView} label="Data Table" />
      <NavButton Icon={BsAlignMiddle} page={Pages.AverageSpending} label="Average Spending" />
      <NavButton
        Icon={RiBarChartHorizontalFill}
        page={Pages.RangeIncomeExpense}
        label="Income vs Expenses"
      />
      <NavButton Icon={FaChartBar} page={Pages.BarChart} label="Bar Chart" />
      <NavButton Icon={LuChartColumnStacked} page={Pages.StackedBarChart} label="Stacked Bar Chart" />
      <NavButton Icon={FaChartLine} page={Pages.YTDChart} label="Year to Date" />
      <NavButton Icon={TbChartSankey} page={Pages.Sankey} label="Sankey" />
    </div>
  );
}
