import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@chakra-ui/react";
import { FiArrowLeft, FiEdit3, FiInbox, FiTrash2 } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { InsightsView } from "@/components/InsightsView/InsightsView";
import { EmptyState } from "@/components/ui/empty-state";
import { useExpensesStore } from "@/store/store";
import { API, Expense, Response } from "@/types/types";
import { Pages } from "@/types/routes";
import { INCOME_GROUP, SAVINGS_GROUP } from "@/utils/expense-utils";
import { formatCurrency, formatDate } from "@/utils/utils";
import styles from "./Groups.module.scss";

type GroupSummary = {
  name: string;
  items: Expense[];
  total: number;
  startIso: string;
  endIso: string;
};

function summarizeGroups(allExpenses: Expense[]): GroupSummary[] {
  const byGroup = new Map<string, Expense[]>();
  for (const e of allExpenses) {
    if (!e.group) continue;
    const list = byGroup.get(e.group);
    if (list) list.push(e);
    else byGroup.set(e.group, [e]);
  }

  const summaries: GroupSummary[] = [];
  for (const [name, items] of byGroup) {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    summaries.push({
      name,
      items,
      total: items.reduce((sum, e) => sum + e.amount, 0),
      startIso: sorted[0].date,
      endIso: sorted[sorted.length - 1].date,
    });
  }

  const RESERVED: string[] = [INCOME_GROUP, SAVINGS_GROUP];

  return summaries.sort((a, b) => {
    const ai = RESERVED.indexOf(a.name);
    const bi = RESERVED.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

const groupStat = (name: string): { label: string; className: string } => {
  if (name === INCOME_GROUP) {
    return { label: "Income", className: styles.valuePos };
  }
  if (name === SAVINGS_GROUP) {
    return { label: "Savings", className: styles.valueNeutral };
  }
  return { label: "Total", className: "" };
};

const GroupCard = ({ group }: { group: GroupSummary }) => {
  const navigate = useNavigate();
  const stat = groupStat(group.name);
  const totalClass =
    stat.className ||
    (group.total > 0
      ? styles.valueNeg
      : group.total < 0
        ? styles.valuePos
        : "");

  return (
    <div
      className={styles.groupCard}
      onClick={() =>
        navigate(`${Pages.Groups}/${encodeURIComponent(group.name)}`)
      }
    >
      <div className={styles.groupMetaRow}>
        <span className={styles.groupName}>{group.name}</span>
        <span>{group.items.length} items</span>
      </div>
      <span className={styles.groupMetaRow}>
        {formatDate(group.startIso)} → {formatDate(group.endIso)}
      </span>
      <div className={styles.groupStats}>
        <div className={styles.groupStat}>
          <span className={styles.cardLabel}>{stat.label}</span>
          <span className={`${styles.statValue} ${totalClass}`}>
            {formatCurrency(group.total)}
          </span>
        </div>
      </div>
    </div>
  );
};

function GroupsList() {
  const navigate = useNavigate();
  const { value: allExpenses } = useExpensesStore();

  const groups = useMemo(
    () => summarizeGroups(allExpenses),
    [allExpenses]
  );

  return (
    <GenericPage
      title="Groups"
      hasRange={false}
      needsData={false}
      actions={
        <Button size="sm" variant="outline" onClick={() => navigate(Pages.TableView)}>
          Assign in Data Table
        </Button>
      }
    >
      <div className={styles.page}>
        {groups.length === 0 ? (
          <div className={styles.emptyState}>
            <EmptyState
              icon={<FiInbox />}
              title="No groups yet"
              description="Select rows in the Data Table and use Set Group to organize them — e.g. all the food, travel and entertainment from one trip."
            />
          </div>
        ) : (
          <div className={styles.groupGrid}>
            {groups.map((g) => (
              <GroupCard key={g.name} group={g} />
            ))}
          </div>
        )}
      </div>
    </GenericPage>
  );
}

function GroupDetail({ groupName }: { groupName: string }) {
  const navigate = useNavigate();
  const { value: allExpenses } = useExpensesStore();
  const isReserved = groupName === INCOME_GROUP || groupName === SAVINGS_GROUP;

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(groupName);
  const [confirmClear, setConfirmClear] = useState(false);
  const [working, setWorking] = useState(false);

  const items = useMemo(
    () => allExpenses.filter((e) => e.group === groupName),
    [allExpenses, groupName]
  );

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const applyGroupChange = useCallback(
    async (nextGroup: string | undefined) => {
      if (items.length === 0) return;
      setWorking(true);
      await invoke<Response<null>>(API.UpdateBulkExpenses, {
        hashes: items.map((e) => e.id),
        expenses: items.map((e) => ({ ...e, group: nextGroup })),
      });
      setWorking(false);
    },
    [items]
  );

  const handleRename = useCallback(async () => {
    const next = renameValue.trim();
    setRenaming(false);
    if (!next || next === groupName) return;
    await applyGroupChange(next);
    navigate(`${Pages.Groups}/${encodeURIComponent(next)}`, { replace: true });
  }, [renameValue, groupName, applyGroupChange, navigate]);

  const handleClear = useCallback(async () => {
    setConfirmClear(false);
    await applyGroupChange(undefined);
    navigate(Pages.Groups, { replace: true });
  }, [applyGroupChange, navigate]);

  return (
    <GenericPage
      title={groupName}
      hasRange={false}
      needsData={false}
      actions={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {!isReserved && items.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={working}
                onClick={() => {
                  setRenameValue(groupName);
                  setRenaming(true);
                }}
              >
                <FiEdit3 />
                Rename
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette={confirmClear ? "red" : undefined}
                disabled={working}
                onClick={() => (confirmClear ? handleClear() : setConfirmClear(true))}
              >
                <FiTrash2 />
                {confirmClear ? "Confirm clear?" : "Clear Group"}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate(Pages.Groups)}>
            <FiArrowLeft />
            All Groups
          </Button>
        </div>
      }
    >
      <div className={styles.page}>
        {renaming && (
          <div className={styles.renameCard}>
            <label className={styles.cardLabel} htmlFor="rename-group-input">
              Rename “{groupName}”
            </label>
            <input
              id="rename-group-input"
              className={styles.fieldInput}
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              list="rename-group-options"
            />
            <datalist id="rename-group-options">
              {[...new Set(allExpenses.map((e) => e.group).filter((g): g is string => !!g && g !== groupName))].map(
                (g) => (
                  <option key={g} value={g} />
                )
              )}
            </datalist>
            <div className={styles.renameActions}>
              {renameValue.trim() === INCOME_GROUP && (
                <span className={styles.valuePos}>Will be classified as Income</span>
              )}
              {renameValue.trim() === SAVINGS_GROUP && (
                <span className={styles.valueNeutral}>Will be classified as Savings</span>
              )}
              <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorPalette="green"
                disabled={
                  working ||
                  renameValue.trim() === "" ||
                  renameValue.trim() === groupName
                }
                onClick={handleRename}
              >
                Save
              </Button>
            </div>
          </div>
        )}
        <InsightsView
          items={items}
          variant="group"
          emptyTitle="Nothing in this group"
          emptyDescription="The group may have been removed. Go back to see your other groups."
        />
      </div>
    </GenericPage>
  );
}

export function Groups() {
  const { groupName } = useParams();

  if (!groupName) return <GroupsList />;
  return <GroupDetail groupName={decodeURIComponent(groupName)} />;
}
