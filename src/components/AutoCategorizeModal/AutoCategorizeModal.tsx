import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Button, SegmentGroup, Spinner } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";
import { useExpensesStore } from "@/store/store";
import { API, Expense, Response, Tag } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { AutoCategorizeMode, CategorizeSuggestion, computeSuggestions } from "@/utils/auto-categorize";
import { formatCurrency } from "@/utils/utils";
import { format } from "date-fns";
import { toaster } from "@/components/ui/toaster";
import { useSettingsStore } from "@/store/SettingsStore";
import styles from "./AutoCategorizeModal.module.scss";

const acceptLabelFor = (mode: AutoCategorizeMode) =>
  mode === "tags" ? "Add tag" : "Set group";

const applySuggestion = (e: Expense, mode: AutoCategorizeMode, suggested: string): Expense => {
  if (mode === "tags") {
    return { ...e, tags: [suggested as Tag] };
  }
  return { ...e, group: suggested };
};

export const AutoCategorizeModal = () => {
  const { value: allExpenses } = useExpensesStore();
  const disabledTags = useSettingsStore("disabledTags");
  const disabledGroups = useSettingsStore("disabledGroups");

  const [mode, setMode] = useState<AutoCategorizeMode>("tags");
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const suggestions = useMemo<CategorizeSuggestion[]>(() => {
    if (!allExpenses) return [];
    return computeSuggestions(allExpenses, mode).filter(
      (s) => !declined.has(s.expense.id)
    );
  }, [allExpenses, mode, declined]);

  const handleModeChange = (next: AutoCategorizeMode) => {
    setMode(next);
    setDeclined(new Set());
    setAcceptedCount(0);
    setDeclinedCount(0);
  };

  const handleDecline = useCallback((id: string) => {
    setDeclined((prev) => new Set(prev).add(id));
    setDeclinedCount((c) => c + 1);
  }, []);

  const handleAccept = useCallback(
    async (s: CategorizeSuggestion) => {
      setBusyIds((prev) => new Set(prev).add(s.expense.id));
      const updated = applySuggestion(s.expense, mode, s.suggested);

      const res = await invoke<Response<null>>(API.UpdateExpense, {
        hash: updated.id,
        expense: updated,
      });

      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(s.expense.id);
        return next;
      });

      if (res.status >= 400) {
        toaster.create({
          title: "Failed to update",
          description: res.header,
          type: "error",
        });
        return;
      }

      setDeclined((prev) => new Set(prev).add(s.expense.id));
      setAcceptedCount((c) => c + 1);
    },
    [mode]
  );

  const hasDisabledRule = useCallback(
    (suggested: string) =>
      mode === "tags" ? disabledTags.includes(suggested) : disabledGroups.includes(suggested),
    [mode, disabledTags, disabledGroups]
  );

  const total = suggestions.length + acceptedCount + declinedCount;

  return (
    <GenericModal overlay={Overlay.AutoCategorizeModal} fullscreen>
      <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Auto-Categorize</span>
        <span className={styles.subtitle}>
          Suggests a tag or group for untagged entries by matching them to other
          entries with the same description. Accept to apply, decline to skip.
        </span>
      </div>

      <div className={styles.modeRow}>
        <SegmentGroup.Root
          size="xs"
          value={mode}
          onValueChange={(e) => handleModeChange(e.value as AutoCategorizeMode)}
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={["tags", "groups"]} />
        </SegmentGroup.Root>
        <span className={styles.summary}>
          {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"}
          {acceptedCount > 0 && ` · ${acceptedCount} accepted`}
          {declinedCount > 0 && ` · ${declinedCount} declined`}
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className={styles.empty}>
          {mode === "tags"
            ? "No untagged expenses with a matching tagged entry."
            : "No expenses without a group with a matching grouped entry."}
        </div>
      ) : (
        <div className={styles.list}>
          {suggestions.map((s) => {
            const disabled = hasDisabledRule(s.suggested);
            return (
              <div key={s.expense.id} className={styles.row}>
                <div className={styles.desc}>
                  <span className={styles.descMain}>{s.expense.description || "(no description)"}</span>
                  <span className={styles.descMeta}>
                    <span>{format(new Date(s.expense.date), "MMM d, yyyy")}</span>
                    <span>{formatCurrency(s.expense.amount)}</span>
                  </span>
                </div>
                <span className={styles.suggestion}>{s.suggested}</span>
                <span className={styles.matchCount}>
                  {s.matchCount} similar
                </span>
                <div className={styles.actions}>
                  <button
                    className={`${styles.actionBtn} ${styles.accept}`}
                    disabled={busyIds.has(s.expense.id) || disabled}
                    onClick={() => handleAccept(s)}
                  >
                    {busyIds.has(s.expense.id) ? (
                      <Spinner size="xs" />
                    ) : disabled ? (
                      "Hidden"
                    ) : (
                      acceptLabelFor(mode)
                    )}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.decline}`}
                    onClick={() => handleDecline(s.expense.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.progressHint}>
          {Math.min(acceptedCount + declinedCount, total)} of {total} reviewed
        </span>
        <Button variant="ghost" onClick={closeAllOverlays}>
          Close
        </Button>
      </div>
      </div>
    </GenericModal>
  );
};
