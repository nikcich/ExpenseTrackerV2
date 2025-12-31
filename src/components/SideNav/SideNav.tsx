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
import { BsFillGrid1X2Fill } from "react-icons/bs";
import { TbChartSankey } from "react-icons/tb";

const NavButton = ({ Icon, page }: { Icon: React.FC; page: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      className={cx(
        styles.navButton,
        location.pathname === page ? styles.active : ""
      )}
      onClick={() => navigate(page)}
    >
      <Icon />
    </button>
  );
};

export function SideNav() {
  return (
    <div className={styles.navContainer}>
      <NavButton Icon={AiOutlineHome} page={Pages.Home} />
      <NavButton Icon={FaSlidersH} page={Pages.Settings} />
      <NavButton Icon={PiFileCsvBold} page={Pages.FileOpener} />
      <NavButton Icon={FaTable} page={Pages.TableView} />
      <NavButton Icon={BsAlignMiddle} page={Pages.AverageSpending} />
      <NavButton
        Icon={RiBarChartHorizontalFill}
        page={Pages.RangeIncomeExpense}
      />
      <NavButton Icon={FaChartBar} page={Pages.BarChart} />
      <NavButton Icon={LuChartColumnStacked} page={Pages.StackedBarChart} />
      <NavButton Icon={FaChartLine} page={Pages.YTDChart} />
      <NavButton Icon={TbChartSankey} page={Pages.Sankey} />
      <NavButton Icon={BsFillGrid1X2Fill} page={Pages.Test} />
    </div>
  );
}
