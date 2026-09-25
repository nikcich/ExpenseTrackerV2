import { GenericPage } from "@/components/GenericPage/GenericPage";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useNavigate } from "react-router-dom";
import { Pages } from "@/types/routes";
import { CHART_WIDGET_DEFS } from "./widgets";
import styles from "./Charts.module.scss";

export function Charts() {
  const navigate = useNavigate();

  return (
    <GenericPage title="Charts" needsData={false} footer={<BrushScrubber />}>
      <div className={styles.grid}>
        {CHART_WIDGET_DEFS.map((def) => {
          const Icon = def.icon;
          return (
            <button
              key={def.type}
              type="button"
              className={styles.card}
              onClick={() => navigate(`${Pages.Charts}/${def.type}`)}
            >
              <span className={styles.cardIcon} aria-hidden>
                <Icon size={34} />
              </span>
              <span className={styles.cardTitle}>{def.label}</span>
              <span className={styles.cardDesc}>{def.description}</span>
            </button>
          );
        })}
      </div>
    </GenericPage>
  );
}