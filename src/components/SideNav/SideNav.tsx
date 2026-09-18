import styles from "./SideNav.module.scss";
import { useNavigate, useLocation } from "react-router-dom";
import cx from "classnames";
import { useEffect, useRef, useState } from "react";
import { IoSettingsOutline } from "react-icons/io5";
import { PiMagnifyingGlassBold } from "react-icons/pi";
import type { IconType } from "react-icons";
import { FiChevronRight, FiChevronLeft, FiChevronUp, FiChevronDown } from "react-icons/fi";
import { Tooltip } from "@/components/ui/tooltip";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { useSettingsStore, setSettingsStore } from "@/store/SettingsStore";
import { useHasRsuData, useHasSsdiData } from "@/store/store";
import { NAV_SECTIONS, type NavItem } from "@/types/nav";

const SCROLL_STEP_FACTOR = 0.85;

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

  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollable = canScrollUp || canScrollDown;

  const updateScrollState = () => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0.5);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 0.5);
  };

  useEffect(() => {
    updateScrollState();
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rsuTabEnabled, hasRsuData, ssdiTabEnabled, hasSsdiData]);

  const scrollNav = (dir: 1 | -1) => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({
      top: dir * Math.max(40, el.clientHeight * SCROLL_STEP_FACTOR),
      behavior: "smooth",
    });
  };

  return (
    <div className={cx(styles.navContainer, expanded ? styles.expanded : styles.collapsed)}>
      {scrollable && (
        <button
          className={cx(styles.navButton, styles.chevronButton)}
          disabled={!canScrollUp}
          onClick={() => scrollNav(-1)}
          aria-label="Scroll navigation up"
        >
          <FiChevronUp className={styles.icon} />
        </button>
      )}
      <div className={styles.navItems} ref={navRef} onScroll={updateScrollState}>
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
      {scrollable && (
        <button
          className={cx(styles.navButton, styles.chevronButton)}
          disabled={!canScrollDown}
          onClick={() => scrollNav(1)}
          aria-label="Scroll navigation down"
        >
          <FiChevronDown className={styles.icon} />
        </button>
      )}
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