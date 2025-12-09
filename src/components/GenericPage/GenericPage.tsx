import { Heading } from "@chakra-ui/react";
import styles from "./GenericPage.module.scss";
import { JSX, useMemo } from "react";
import { useDebouncedBrushRange } from "@/store/store";
import { format } from "date-fns";
import { useFilteredExpenses, useFilteredIncome } from "@/hooks/expenses";

const useHasDisplayData = () => {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();

  const hasExpenses = useMemo(() => {
    return filteredExpenses.length > 0;
  }, [filteredExpenses]);

  const hasIncome = useMemo(() => {
    return filteredIncome.length > 0;
  }, [filteredIncome]);

  return hasExpenses || hasIncome;
};

export const GenericPage = ({
  actions,
  title,
  children,
  footer,
}: {
  actions?: JSX.Element;
  title: string;
  children: React.ReactNode;
  footer?: JSX.Element;
}) => {
  const [range] = useDebouncedBrushRange();
  const hasDisplayData = useHasDisplayData();

  const dateRangeText = useMemo(() => {
    if (range) {
      const start = new Date(range[0]);
      const end = new Date(range[1]);

      const formattedStart = format(start, "EEE MMM d");
      const formattedEnd = format(end, "EEE MMM d");

      return `${formattedStart} - ${formattedEnd}`;
    }

    return "";
  }, [range]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Heading size="xl">
          {title} {dateRangeText !== "" ? `: ${dateRangeText}` : ""}
        </Heading>

        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.children}>
        {hasDisplayData && <>{children}</>}
        {!hasDisplayData && (
          <div className={styles.noData}>No data to display</div>
        )}
      </div>

      <div className={styles.footer}>{footer}</div>
    </div>
  );
};
