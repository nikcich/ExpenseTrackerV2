import { Button, Menu, SegmentGroup } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { LuPlus, LuX } from "react-icons/lu";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { Mode } from "@/types/types";
import {
  ChartWidgetInstance,
  ChartWidgetType,
  addChartWidget,
  moveChartWidget,
  removeChartWidget,
  updateChartWidget,
  useChartWidgets,
} from "@/store/ChartsStore";
import { CHART_WIDGET_DEFS, getChartWidgetDef } from "./widgets";
import styles from "./Charts.module.scss";

const AddChartMenu = ({
  existingTypes,
}: {
  existingTypes: ChartWidgetType[];
}) => {
  const available = CHART_WIDGET_DEFS.filter(
    (def) => !existingTypes.includes(def.type)
  );

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" variant="outline" width="100%">
          <LuPlus size={14} />
          Add Chart
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content style={{ maxWidth: "24rem" }}>
          {available.map((def) => (
            <Menu.Item
              key={def.type}
              value={def.type}
              onClick={() => addChartWidget(def.type, def.defaultMode)}
            >
              <div>
                <div>{def.label}</div>
                <div className={styles.menuDesc}>{def.description}</div>
              </div>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
};

const WidgetTile = ({
  instance,
  index,
  total,
}: {
  instance: ChartWidgetInstance;
  index: number;
  total: number;
}) => {
  const def = getChartWidgetDef(instance.type);
  if (!def) return null;
  const { Component } = def;

  return (
    <section className={styles.tile}>
      <div className={styles.tileHeader}>
        <span className={styles.tileTitle}>{def.label}</span>
        <div className={styles.tileActions}>
          {def.modes && (
            <SegmentGroup.Root
              size="xs"
              value={instance.mode ?? def.defaultMode}
              onValueChange={(e) =>
                updateChartWidget(instance.id, { mode: e.value as Mode })
              }
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items items={def.modes} />
            </SegmentGroup.Root>
          )}
          <button
            className={styles.iconBtn}
            title="Move up"
            disabled={index === 0}
            onClick={() => moveChartWidget(instance.id, -1)}
          >
            <FiChevronUp size={14} />
          </button>
          <button
            className={styles.iconBtn}
            title="Move down"
            disabled={index === total - 1}
            onClick={() => moveChartWidget(instance.id, 1)}
          >
            <FiChevronDown size={14} />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            title="Remove chart"
            onClick={() => removeChartWidget(instance.id)}
          >
            <LuX size={14} />
          </button>
        </div>
      </div>
      <div className={styles.tileBody}>
        <Component instance={instance} />
      </div>
    </section>
  );
};

export function Charts() {
  const widgets = useChartWidgets();
  const existingTypes = widgets.map((w) => w.type);
  const hasAvailableCharts = CHART_WIDGET_DEFS.some(
    (def) => !existingTypes.includes(def.type)
  );

  return (
    <GenericPage title="Charts" footer={<BrushScrubber />} scrollSnap>
      <div className={styles.content}>
        {widgets.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No charts yet</div>
            <div>Use “Add Chart” below to build your dashboard.</div>
          </div>
        )}
        <div className={styles.list}>
          {widgets.map((widget, index) => (
            <WidgetTile
              key={widget.id}
              instance={widget}
              index={index}
              total={widgets.length}
            />
          ))}
          {hasAvailableCharts && (
            <div className={styles.addRow}>
              <AddChartMenu existingTypes={existingTypes} />
            </div>
          )}
        </div>
      </div>
    </GenericPage>
  );
}
