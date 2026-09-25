import { GenericPage } from "@/components/GenericPage/GenericPage";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { SegmentGroup } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { Mode } from "@/types/types";
import { Pages } from "@/types/routes";
import { getChartWidgetDef } from "./widgets";
import {
  ChartWidgetType,
  setChartMode,
  useChartMode,
} from "@/store/ChartsStore";
import styles from "./ChartDetail.module.scss";

export function ChartDetail() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const def = getChartWidgetDef(type as ChartWidgetType);
  const mode = useChartMode(
    def?.type as ChartWidgetType,
    def?.defaultMode ?? Mode.MONTHLY
  );

  if (!def) {
    return <Navigate to={Pages.Charts} replace />;
  }

  const Comp = def.Component;
  return (
    <GenericPage
      title={def.label}
      footer={<BrushScrubber />}
      leading={
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate(Pages.Charts)}
          aria-label="Back to all charts"
        >
          <LuArrowLeft size={14} /> All charts
        </button>
      }
      actions={
        <>
          {def.modes && (
            <SegmentGroup.Root
              value={mode}
              onValueChange={(e) => setChartMode(def.type, e.value as Mode)}
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items items={def.modes} />
            </SegmentGroup.Root>
          )}
        </>
      }
    >
      <div className={styles.page}>
        <Comp mode={mode} />
      </div>
    </GenericPage>
  );
}