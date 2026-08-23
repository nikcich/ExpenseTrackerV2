import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { InsightsView } from "@/components/InsightsView/InsightsView";
import { useSelection } from "@/store/SelectionStore";
import { useExpensesStore } from "@/store/store";
import { Pages } from "@/types/routes";
import styles from "@/components/InsightsView/InsightsView.module.scss";

export function SelectionInsights() {
  const navigate = useNavigate();
  const selection = useSelection();
  const { value: allExpenses } = useExpensesStore();

  const selectedItems = useMemo(() => {
    if (!allExpenses || selection.length === 0) return [];
    const ids = new Set(selection);
    return allExpenses.filter((e) => ids.has(e.id));
  }, [allExpenses, selection]);

  return (
    <GenericPage
      title="Selection Insights"
      hasRange={false}
      needsData={false}
      actions={
        <Button size="sm" variant="outline" onClick={() => navigate(Pages.TableView)}>
          <FiArrowLeft />
          Back to Table
        </Button>
      }
    >
      <div className={styles.page}>
        <InsightsView
          items={selectedItems}
          emptyTitle={selection.length === 0 ? "Nothing selected" : "Selected items no longer exist"}
          emptyDescription={
            selection.length === 0
              ? "Select rows in the Data Table and choose Inspect Selection to see insights about them here."
              : "The selected items may have been deleted. Go back and make a new selection."
          }
        />
      </div>
    </GenericPage>
  );
}
