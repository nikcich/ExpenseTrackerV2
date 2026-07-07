import React from "react";
import styles from "./SideNav.module.scss";
import { Pages } from "../../types/routes";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { FaTable } from "react-icons/fa6";
import { FaChartBar } from "react-icons/fa";
import { LuChartColumnStacked } from "react-icons/lu";
import { FaSlidersH } from "react-icons/fa";
import { RiBarChartHorizontalFill } from "react-icons/ri";
import { FaChartLine } from "react-icons/fa6";
import { BsAlignMiddle } from "react-icons/bs";
import { TbChartSankey } from "react-icons/tb";
import { MdOutlineTrendingUp } from "react-icons/md";
import { PiCompassLight, PiChartPieSlice } from "react-icons/pi";
import { FaRobot } from "react-icons/fa";
import { Tooltip } from "@/components/ui/tooltip";
import { enableOverlay, Overlay } from "@/store/OverlayStore";

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
      <div className={styles.navItems}>
        <NavButton Icon={PiCompassLight} page={Pages.Overview} label="Overview" />
        <NavButton Icon={PiChartPieSlice} page={Pages.Accounts} label="Accounts" />
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
        <NavButton Icon={FaRobot} page={Pages.AiTest} label="AI Test" />
      </div>
      <div className={styles.spacer} />
      <Tooltip content="Settings" positioning={{ placement: "right" }}>
        <button
          className={styles.navButton}
          onClick={() => enableOverlay(Overlay.SettingsModal)}
        >
          <FaSlidersH />
        </button>
      </Tooltip>
    </div>
  );
}
