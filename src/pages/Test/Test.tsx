import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  GridLayout,
  useContainerWidth,
  verticalCompactor,
} from "react-grid-layout";
import { ResizeConfig } from "react-grid-layout/core";
import styles from "./Test.module.scss";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GroupedBarChartCore } from "../GroupedBarChart/GroupedBarChart";
import { Mode } from "@/types/types";
import { AverageSpendingCore } from "../AverageSpending/AverageSpending";
import { RangeIncomeExpenseChartCore } from "../RangeIncomeExpenseChart/RangeIncomeExpenseChart";
import { TagStackedBarChartCore } from "../TagStackedBarChart/TagStackedBarChart";
import { YearToDateChartCore } from "../YearToDateChart/YearToDateChart";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { SegmentGroup } from "@chakra-ui/react";

const resizeConfig: ResizeConfig = {
  enabled: true,
  handles: ["se", "sw", "ne", "nw"],
};

type Item = {
  i: string;
  component: (mode: Mode) => React.ReactNode;
  w: number;
  h: number;
  x: number;
  y: number;
};

const BASE_GRID: Item[] = [
  {
    i: "1",
    component: (_: Mode) => <RangeIncomeExpenseChartCore legend={false} />,
    w: 7,
    h: 6,
    x: 0,
    y: 0,
  },
  {
    i: "2",
    component: (mode: Mode) => (
      <TagStackedBarChartCore mode={mode} legend={false} />
    ),
    w: 20,
    h: 10,
    x: 0,
    y: 18,
  },
  {
    i: "3",
    component: (mode: Mode) => (
      <GroupedBarChartCore mode={mode} legend={false} />
    ),
    w: 17,
    h: 12,
    x: 3,
    y: 6,
  },
  {
    i: "4",
    component: (_: Mode) => <AverageSpendingCore legend={false} />,
    w: 3,
    h: 12,
    x: 0,
    y: 6,
  },
  {
    i: "5",
    component: (_: Mode) => <YearToDateChartCore legend={false} />,
    w: 13,
    h: 6,
    x: 7,
    y: 0,
  },
];

const getGridContent = (mode: Mode) => {
  return BASE_GRID.map((item) => ({
    ...item,
    component: () => item.component(mode),
  }));
};

export function Test() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);

  const gridContent = useMemo(() => {
    return getGridContent(mode);
  }, [mode]);

  const layout = gridContent.map(({ i, x, y, w, h }) => ({
    i,
    x,
    y,
    w,
    h,
  }));

  return (
    <GenericPage
      title="Multi-Chart Grid"
      footer={<BrushScrubber />}
      actions={
        <>
          <SegmentGroup.Root
            value={mode}
            onValueChange={(e) => setMode(e.value as Mode)}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={Object.values(Mode)} />
          </SegmentGroup.Root>
        </>
      }
    >
      <div
        ref={containerRef}
        style={{ position: "relative", overflow: "hidden" }}
      >
        {mounted && (
          <GridLayout
            layout={layout}
            width={width}
            compactor={verticalCompactor}
            gridConfig={{ cols: 20, rowHeight: 30, containerPadding: [10, 10] }}
            resizeConfig={resizeConfig}
            onResizeStop={() =>
              // trigger resize on window
              window.dispatchEvent(new Event("resize"))
            }
          >
            {gridContent.map((item) => (
              <div key={item.i} className={styles.item}>
                <div className={styles.container}>{item.component()}</div>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </GenericPage>
  );
}
