import { Heading, SkeletonText, Flex } from "@chakra-ui/react";
import styles from "./GenericPage.module.scss";
import { JSX, useEffect, useMemo, useState } from "react";
import { useDebouncedBrushRange } from "@/store/store";
import { format } from "date-fns";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocation } from "react-router-dom";
import { FiInbox } from "react-icons/fi";

const LOADING_DURATION_MS = 800;

const useHasDisplayData = () => {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const hasExpenses = useMemo(() => {
    return filteredExpenses.length > 0;
  }, [filteredExpenses]);

  const hasIncome = useMemo(() => {
    return filteredIncome.length > 0;
  }, [filteredIncome]);

  const hasSavings = useMemo(() => {
    return filteredSavings.length > 0;
  }, [filteredSavings]);

  return hasExpenses || hasIncome || hasSavings;
};

const useInitialLoading = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOADING_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return loading;
};

const emptyStateConfig: Record<string, { title: string; description: string }> = {
  "/table-view": {
    title: "No transactions yet",
    description: "Import a CSV file or create an expense manually to populate the table.",
  },
  "/bar-chart": {
    title: "No data to chart",
    description: "Add some expenses or adjust the date range to see your bar chart.",
  },
  "/stacked-bar-chart": {
    title: "No data to chart",
    description: "Add some expenses or adjust the date range to see your stacked bar chart.",
  },
  "/range-income-expense": {
    title: "No data to display",
    description: "Add income or expenses in the selected date range to see the comparison.",
  },
  "/year-to-date-chart": {
    title: "No data for year-over-year",
    description: "Add expenses across multiple years to see the year-to-date comparison.",
  },
  "/average-spending": {
    title: "No spending data",
    description: "Add some expenses to see your average monthly spending breakdown.",
  },
  "/Sankey": {
    title: "No cash flow data",
    description: "Add income and expenses to see your cash flow Sankey diagram.",
  },
  "/settings": {
    title: "No tags available",
    description: "Add expenses with tags to customize which tags appear in charts.",
  },
};

export const GenericPage = ({
  actions,
  title,
  children,
  footer,
  hasRange = true,
  needsData = true,
}: {
  actions?: JSX.Element;
  title: string;
  children: React.ReactNode;
  footer?: JSX.Element;
  hasRange?: boolean;
  needsData?: boolean;
}) => {
  const [range] = useDebouncedBrushRange();
  const hasDisplayData = useHasDisplayData();
  const initialLoading = useInitialLoading();
  const location = useLocation();

  const dateRangeText = useMemo(() => {
    if (range) {
      const start = new Date(range[0]);
      const end = new Date(range[1]);

      const formattedStart = format(start, "EEE MMM d yyyy");
      const formattedEnd = format(end, "EEE MMM d yyyy");

      return `${formattedStart} - ${formattedEnd}`;
    }

    return "";
  }, [range]);

  const displayContent = hasDisplayData || !needsData;
  const config = emptyStateConfig[location.pathname];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Heading size="xl">
          {title}
          {hasRange ? (dateRangeText !== "" ? `: ${dateRangeText}` : "") : ""}
        </Heading>

        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.children}>
        {initialLoading && needsData && (
          <Flex direction="column" gap={4} p={6}>
            <SkeletonText noOfLines={1} height="6" width="40%" />
            <SkeletonText noOfLines={6} gap={4} />
          </Flex>
        )}
        {!initialLoading && displayContent && <>{children}</>}
        {!initialLoading && !displayContent && (
          <div className={styles.noData}>
            <EmptyState
              icon={<FiInbox />}
              title={config?.title ?? "No data to display"}
              description={config?.description ?? "Import a CSV file or adjust the date range to see data here."}
            />
          </div>
        )}
      </div>

      <div className={styles.footer}>{footer}</div>
    </div>
  );
};
