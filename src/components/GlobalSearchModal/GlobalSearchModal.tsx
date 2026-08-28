import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Text, Tag as TagComp } from "@chakra-ui/react";
import { useExpensesStore } from "@/store/store";
import { setNavFilter } from "@/store/NavFilterStore";
import { textRule } from "@/utils/custom-filter";
import { Pages } from "@/types/routes";
import { format } from "date-fns";
import { formatCompactCurrency } from "@/utils/utils";
import { expenseMatchesSearch } from "@/utils/search";
import { getExpenseKind } from "@/utils/expense-utils";
import styles from "./GlobalSearchModal.module.scss";

const kindPalette = (kind: string) =>
  kind === "income" ? "green" : kind === "savings" ? "yellow" : "purple";

export const GlobalSearchModal = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { value } = useExpensesStore();

  const results = useMemo(() => {
    if (!query.trim() || !value) return [];

    return value
      .filter((e) => expenseMatchesSearch(e, query))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  }, [query, value]);

  const handleSelect = () => {
    setNavFilter(
      [textRule(query.trim())],
      `Global Search · "${query.trim()}"`
    );
    closeAllOverlays();
    navigate(Pages.TableView);
  };

  return (
    <GenericModal overlay={Overlay.SearchModal}>
      <div className={styles.container}>
        <Text fontSize="lg" mb={1}>
          Search Expenses
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={3}>
          Search by description, tag, group, or amount. Select a result to open it in the data table with the search applied.
        </Text>
        <Input
          autoFocus
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="lg"
          mb={3}
        />
        <div className={styles.results}>
          {query.trim() === "" && (
            <Text color="fg.subtle" fontSize="sm">
              Start typing to search.
            </Text>
          )}
          {query.trim() !== "" && results.length === 0 && (
            <Text color="fg.subtle" fontSize="sm">
              No matches.
            </Text>
          )}
          {results.map((e) => {
            const kind = getExpenseKind(e);
            return (
              <button
                key={e.id}
                className={styles.resultItem}
                onClick={handleSelect}
              >
                <div className={styles.mainRow}>
                  <span className={styles.description}>{e.description}</span>
                  <span className={e.amount < 0 ? styles.positive : styles.negative}>
                    {formatCompactCurrency(e.amount)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span>{format(new Date(e.date), "MM-dd-yyyy")}</span>
                  {e.group && (
                    <TagComp.Root colorPalette={kindPalette(kind)}>
                      <TagComp.Label>{e.group}</TagComp.Label>
                    </TagComp.Root>
                  )}
                  {e.tags.map((t) => (
                    <TagComp.Root key={t} colorPalette="orange">
                      <TagComp.Label>{t}</TagComp.Label>
                    </TagComp.Root>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={closeAllOverlays}>
            Close
          </button>
        </div>
      </div>
    </GenericModal>
  );
};
