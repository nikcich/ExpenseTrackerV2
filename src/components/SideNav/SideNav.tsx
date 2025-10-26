import React from "react";
import styles from "./SideNav.module.scss";
import { AiOutlineHome } from "react-icons/ai";
import { Pages } from "../../types/routes";
import { useNavigate } from "react-router-dom";
import { GrTest } from "react-icons/gr";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { FaTable } from "react-icons/fa6";
import { FaChartBar } from "react-icons/fa";
import { LuChartColumnStacked } from "react-icons/lu";
import { FaSlidersH } from "react-icons/fa";

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
      <NavButton Icon={GrTest} page={Pages.Test} />
      <NavButton Icon={FaTable} page={Pages.TableView} />
      <NavButton Icon={FaChartBar} page={Pages.BarChart} />
      <NavButton Icon={LuChartColumnStacked} page={Pages.StackedBarChart} />
    </div>
  );
}
