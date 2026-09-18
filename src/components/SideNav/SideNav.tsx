import styles from "./SideNav.module.scss";
import { useNavigate, useLocation } from "react-router-dom";
import cx from "classnames";
import { IoSettingsOutline } from "react-icons/io5";
import { PiMagnifyingGlassBold } from "react-icons/pi";
import type { IconType } from "react-icons";
import { Tooltip } from "@/components/ui/tooltip";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { useSettingsStore, setSettingsStore } from "@/store/SettingsStore";
import { useHasRsuData, useHasSsdiData } from "@/store/store";
import { NAV_SECTIONS, type NavItem } from "@/types/nav";
import { FiChevronRight,FiChevronLeft } from "react-icons/fi";

const SideNavButton = ({
  Icon,
  label,
  active,
  expanded,
  onClick,
}: {
  Icon: IconType;
  label: string;
  active?: boolean;
  expanded: boolean;
  onClick: () => void;
}) => {
  const content = (
    <button
      className={cx(
        styles.navButton,
        active && styles.active,
        expanded && styles.expanded,
      )}
      onClick={onClick}
    >
      <Icon className={styles.icon} />
      {expanded && <span className={styles.label}>{label}</span>}
    </button>
  );
  if (expanded) return content;
  return (
    <Tooltip content={label} positioning={{ placement: "right" }}>
      {content}
    </Tooltip>
  );
};

export function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const rsuTabEnabled = useSettingsStore("rsuTabEnabled");
  const hasRsuData = useHasRsuData();
  const ssdiTabEnabled = useSettingsStore("ssdiTabEnabled");
  const hasSsdiData = useHasSsdiData();
  const expanded = useSettingsStore("navExpanded");

  const isVisible = (item: NavItem) => {
    if (item.conditional === "rsu") return rsuTabEnabled || hasRsuData;
    if (item.conditional === "ssdi") return ssdiTabEnabled || hasSsdiData;
    return true;
  };

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(isVisible),
  })).filter((section) => section.items.length > 0);

  return (
    <div className={cx(styles.navContainer, expanded ? styles.expanded : styles.collapsed)}>
      <div className={styles.navItems}>
        <SideNavButton
          Icon={PiMagnifyingGlassBold}
          label="Search (Ctrl+K)"
          expanded={expanded}
          onClick={() => enableOverlay(Overlay.SearchModal)}
        />
        {sections.map((section) => (
          <div key={section.title} className={styles.section}>
            {expanded ? (
              <div className={styles.sectionTitle}>{section.title}</div>
            ) : (
              <div className={styles.sectionDividerWrap}>
                <div className={styles.sectionDivider} />
              </div>
            )}
            {section.items.map((item) => (
              <SideNavButton
                key={item.page}
                Icon={item.icon}
                label={item.label}
                active={location.pathname === item.page}
                expanded={expanded}
                onClick={() => {
                  if (location.pathname !== item.page) navigate(item.page);
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.spacer} />
      <div className={styles.footer}>
        <SideNavButton
          Icon={IoSettingsOutline}
          label="Settings"
          expanded={expanded}
          onClick={() => enableOverlay(Overlay.SettingsModal)}
        />
        <SideNavButton
          Icon={expanded ? FiChevronLeft : FiChevronRight}
          label="Collapse"
          expanded={expanded}
          onClick={() => setSettingsStore({ navExpanded: !expanded })}
        />
      </div>
    </div>
  );
}