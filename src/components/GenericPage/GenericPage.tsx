import { Heading } from "@chakra-ui/react";
import styles from "./GenericPage.module.scss";
import { JSX, useMemo } from "react";
import { useDebouncedBrushRange } from "@/store/store";
import { format } from "date-fns";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";

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
        {displayContent && <>{children}</>}
        {!displayContent && (
          <div className={styles.noData}>No data to display</div>
        )}
      </div>

      <div className={styles.footer}>{footer}</div>
    </div>
  );
};
