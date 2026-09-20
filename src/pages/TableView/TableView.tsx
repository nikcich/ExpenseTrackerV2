import { CoreTable } from "@/components/DataTable/DataTable";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { useExpensesStore } from "@/store/store";
import { getExpenseKind } from "@/utils/expense-utils";
import { expenseMatchesSearch } from "@/utils/search";
import { useExpenseTrackerService } from "@/services/ServiceProvider";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  CloseButton,
  Dialog,
  Input,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import { LuFilter } from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { useSelection, setSelection } from "@/store/SelectionStore";
import { useFilterRules } from "@/store/FilterStore";
import { useNavFilter, clearNavFilter } from "@/store/NavFilterStore";
import { matchesRules } from "@/utils/custom-filter";
import { debounce } from "lodash";
import { Pages } from "@/types/routes";

const ResetExpensesDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { setValue: setExpenses } = useExpensesStore();
  const clearExpenses = async () => {
    setExpenses({});
  };

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Are you sure?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                This action cannot be undone. This will permanently delete all
                entries
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  onOpenChange(false);
                  clearExpenses();
                }}
              >
                Delete
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                }}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

const DeleteSelectionDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const selection = useSelection();
  const service = useExpenseTrackerService();

  const handleDeleteSelection = useCallback(async () => {
    await service.removeBulkExpenses(selection);
    setSelection([]);
  }, [selection, service]);

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete {selection.length} expense(s)?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This action cannot be undone.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  handleDeleteSelection();
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                size="sm"
                onClick={() => onOpenChange(false)}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export function TableView() {
  const expenses = useFilteredExpenses();
  const income = useFilteredIncome();
  const savings = useFilteredSavings();

  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeUntagged, setIncludeUntagged] = useState(true);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteSelectionOpen, setDeleteSelectionOpen] = useState(false);
  const [searchString, setSearchString] = useState("");
  const selection = useSelection();
  const customRules = useFilterRules();
  const navFilter = useNavFilter();

  const normalizedSearch = useMemo(
    () => searchString.trim().toLowerCase(),
    [searchString]
  );

  const deferredSearch = useDeferredValue(normalizedSearch);

  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setSearchString(value), 300),
    []
  );

  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch]);

  const allItems = useMemo(
    () => [...expenses, ...income, ...savings],
    [expenses, income, savings]
  );

  const typeFilteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const kind = getExpenseKind(item);
      const isIncome = kind === "income";
      const isSavings = kind === "savings";
      const isUntagged = !isIncome && !isSavings && item.tags.length === 0;
      const isExpense = !isIncome && !isSavings && !isUntagged;

      if (!includeIncome && isIncome) return false;
      if (!includeSavings && isSavings) return false;
      if (!includeExpenses && isExpense) return false;
      if (!includeUntagged && isUntagged) return false;
      return true;
    });
  }, [allItems, includeIncome, includeExpenses, includeSavings, includeUntagged]);

  const customFilteredItems = useMemo(() => {
    if (customRules.length === 0) return typeFilteredItems;
    return typeFilteredItems.filter((item) => matchesRules(customRules, item));
  }, [typeFilteredItems, customRules]);

  const items = useMemo(() => {
    const base = customFilteredItems;
    if (!navFilter || navFilter.rules.length === 0) return base;
    return base.filter((item) => matchesRules(navFilter.rules, item));
  }, [customFilteredItems, navFilter]);

  const displayedItems = useMemo(() => {
    if (!deferredSearch) return items;
    return items.filter((item) => expenseMatchesSearch(item, deferredSearch));
  }, [items, deferredSearch]);

  const navigate = useNavigate();

  return (
    <>
      <GenericPage
        title={`All Items (${displayedItems.length})`}
        actions={
          <div className={styles.actionRow}>
            <Button size="sm" variant="outline" onClick={() => enableOverlay(Overlay.AutoCategorizeModal)}>
              Auto-Categorize
            </Button>
            <Menu.Root closeOnSelect={false}>
              <Menu.Trigger asChild>
                <Button size="sm" variant="outline">
                  <LuFilter size={14} />
                  Filter
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="custom"
                    onClick={() => enableOverlay(Overlay.FilterModal)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${customRules.length > 0 ? styles.filterActive : ""}`}
                    >
                      {customRules.length > 0 ? `${customRules.length}` : "\u25CB"}
                    </span>
                    {customRules.length > 0
                      ? `Custom Filter (${customRules.length})`
                      : "Custom Filter"}
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="income"
                    onClick={() => setIncludeIncome((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeIncome ? styles.filterActive : ""}`}
                      style={{ color: "#38a169" }}
                    >
                      {includeIncome ? "\u25CF" : "\u25CB"}
                    </span>
                    Income
                  </Menu.Item>
                  <Menu.Item
                    value="expenses"
                    onClick={() => setIncludeExpenses((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeExpenses ? styles.filterActive : ""}`}
                      style={{ color: "#fc8181" }}
                    >
                      {includeExpenses ? "\u25CF" : "\u25CB"}
                    </span>
                    Expenses
                  </Menu.Item>
                  <Menu.Item
                    value="savings"
                    onClick={() => setIncludeSavings((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeSavings ? styles.filterActive : ""}`}
                      style={{ color: "#ecc94b" }}
                    >
                      {includeSavings ? "\u25CF" : "\u25CB"}
                    </span>
                    Savings
                  </Menu.Item>
                  <Menu.Item
                    value="untagged"
                    onClick={() => setIncludeUntagged((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeUntagged ? styles.filterActive : ""}`}
                    >
                      {includeUntagged ? "\u25CF" : "\u25CB"}
                    </span>
                    Untagged
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>

            <Menu.Root>
              <Menu.Trigger asChild>
                <Button size="sm" variant="ghost" className={styles.kebabBtn}>
                  <BsThreeDotsVertical size={16} />
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="create-expense"
                    onClick={() => enableOverlay(Overlay.ManualModal)}
                  >
                    Create Expense
                  </Menu.Item>
                  {selection.length > 0 && (
                    <>
                      <Menu.Separator />
                      <Menu.Item
                        value="inspect-selection"
                        onClick={() => navigate(Pages.SelectionInsights)}
                      >
                        Inspect Selection
                      </Menu.Item>
                      <Menu.Item
                        value="tag-selection"
                        onClick={() => enableOverlay(Overlay.TagModal)}
                      >
                        Tag Selection
                      </Menu.Item>
                      <Menu.Item
                        value="group-selection"
                        onClick={() => enableOverlay(Overlay.GroupModal)}
                      >
                        Set Group
                      </Menu.Item>
                      <Menu.Item
                        value="modify-selection"
                        onClick={() => enableOverlay(Overlay.EditModal)}
                      >
                        Modify Selection
                      </Menu.Item>
                      <Menu.Item
                        value="delete-selection"
                        onClick={() => setDeleteSelectionOpen(true)}
                        colorPalette="red"
                      >
                        Delete Selection
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Separator />
                  <Menu.Item
                    value="delete-all"
                    onClick={() => setDeleteAllOpen(true)}
                    colorPalette="red"
                  >
                    Delete All
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </div>
        }
        footer={<BrushScrubber />}
      >
        <div className={styles.content}>
          {navFilter && navFilter.rules.length > 0 && (
            <div className={styles.navFilterBanner}>
              <span className={styles.navFilterText}>
                Filtered from <strong>{navFilter.source}</strong> — {navFilter.rules.length}{" "}
                rule{navFilter.rules.length === 1 ? "" : "s"} applied.
              </span>
              <button className={styles.navFilterClear} onClick={clearNavFilter}>
                Clear
              </button>
            </div>
          )}
          <Input
            type="search"
            placeholder="Search..."
            onChange={(e) => debouncedSetSearch(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.tableWrap}>
            <CoreTable items={displayedItems} />
          </div>
        </div>
      </GenericPage>

      <ResetExpensesDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
      />
      <DeleteSelectionDialog
        open={deleteSelectionOpen}
        onOpenChange={setDeleteSelectionOpen}
      />
    </>
  );
}
