import { closeAllOverlays, Overlay, useActiveOverlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Button } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
  FILTER_FIELDS,
  FilterField,
  FilterOperatorDef,
  FilterRule,
  getFieldDef,
  getOperatorDef,
  matchesRules,
  TYPE_OPTIONS_LIST,
} from "@/utils/custom-filter";
import { setFilterRules, useFilterRules } from "@/store/FilterStore";
import { useNavFilter, clearNavFilter } from "@/store/NavFilterStore";
import { useAllTagsOptions, useAllGroups } from "@/utils/tags";
import { useExpensesStore } from "@/store/store";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import styles from "./FilterModal.module.scss";

let ruleCounter = 0;
const newRuleId = () => `rule_${++ruleCounter}`;

const needsValue = (op: FilterOperatorDef | undefined) =>
  !!op && !["empty", "notEmpty"].includes(op.id);

function makeDefaultRule(): FilterRule {
  return {
    id: newRuleId(),
    conjunction: "AND",
    negate: false,
    field: "amount",
    operator: "eq",
    value: "",
  };
}

const fieldOptions = (field: FilterField, allGroups: string[]) => {
  switch (field) {
    case "group":
      return allGroups;
    case "type":
      return TYPE_OPTIONS_LIST;
    default:
      return [];
  }
};

const ValueEditor = ({
  rule,
  op,
  allTags,
  allGroups,
  onChange,
}: {
  rule: FilterRule;
  op: FilterOperatorDef | undefined;
  allTags: { value: string; label: string }[];
  allGroups: string[];
  onChange: (value: string | number | string[]) => void;
}) => {
  if (!op || !needsValue(op)) return null;

  switch (op.valueKind) {
    case "number":
      return (
        <input
          type="number"
          className={styles.valueInput}
          value={String(rule.value)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={styles.valueInput}
          value={String(rule.value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "text":
      return (
        <input
          type="text"
          className={styles.valueInput}
          value={String(rule.value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="value"
        />
      );
    case "select": {
      const options = fieldOptions(rule.field, allGroups);
      return (
        <select
          className={styles.valueInput}
          value={String(rule.value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    case "multiSelect":
      return (
        <div className={styles.chipGroup}>
          {allTags.map((tag) => {
            const selected = (rule.value as string[]).includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                className={`${styles.chip} ${selected ? styles.chipActive : ""}`}
                onClick={() =>
                  onChange(
                    selected
                      ? (rule.value as string[]).filter((v) => v !== tag.value)
                      : [...(rule.value as string[]), tag.value]
                  )
                }
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      );
    default:
      return null;
  }
};

const RuleRow = ({
  rule,
  index,
  allTags,
  allGroups,
  onChange,
  onValueChange,
  onRemove,
}: {
  rule: FilterRule;
  index: number;
  allTags: { value: string; label: string }[];
  allGroups: string[];
  onChange: (patch: Partial<FilterRule>) => void;
  onValueChange: (value: string | number | string[]) => void;
  onRemove: () => void;
}) => {
  const fieldDef = getFieldDef(rule.field) ?? getFieldDef("amount")!;
  const op = getOperatorDef(rule.field, rule.operator) ?? fieldDef.operators[0];

  return (
    <div className={styles.ruleRow}>
      {index === 0 ? (
        <span className={styles.conjunctionPlaceholder}>WHERE</span>
      ) : (
        <select
          className={styles.conjunction}
          value={rule.conjunction}
          onChange={(e) => onChange({ conjunction: e.target.value as "AND" | "OR" })}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}

      <button
        type="button"
        title="Negate this rule"
        className={`${styles.notBadge} ${rule.negate ? styles.notActive : ""}`}
        onClick={() => onChange({ negate: !rule.negate })}
      >
        NOT
      </button>

      <select
        className={styles.fieldSelect}
        value={rule.field}
        onChange={(e) => onChange({ field: e.target.value as FilterField })}
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className={styles.opSelect}
        value={rule.operator}
        onChange={(e) => onChange({ operator: e.target.value })}
      >
        {fieldDef.operators.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <ValueEditor
        rule={rule}
        op={op}
        allTags={allTags}
        allGroups={allGroups}
        onChange={onValueChange}
      />

      <button
        type="button"
        title="Remove rule"
        className={styles.removeBtn}
        onClick={onRemove}
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

export const FilterModal = () => {
  const active = useActiveOverlay();
  const isOpen = active === Overlay.FilterModal;
  const rules = useFilterRules();
  const navFilter = useNavFilter();
  const allTags = useAllTagsOptions();
  const allGroups = useAllGroups();
  const { value: allExpenses } = useExpensesStore();

  const [draft, setDraft] = useState<FilterRule[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let active = JSON.parse(JSON.stringify(rules)) as FilterRule[];
    if (navFilter && navFilter.rules.length > 0) {
      active = [
        ...active,
        ...(JSON.parse(JSON.stringify(navFilter.rules)) as FilterRule[]),
      ];
    }
    setDraft(active.length > 0 ? active : [makeDefaultRule()]);
  }, [isOpen]);

  const matchCount = useMemo(
    () =>
      allExpenses
        ? allExpenses.filter((e) => matchesRules(draft, e)).length
        : 0,
    [allExpenses, draft]
  );

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    setDraft((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (patch.field && patch.field !== r.field) {
          const newField = patch.field as FilterField;
          const firstOp = getFieldDef(newField)?.operators[0] ?? getFieldDef("amount")!.operators[0];
          return {
            ...r,
            ...patch,
            field: newField,
            operator: firstOp.id,
            value: firstOp.valueKind === "multiSelect" ? [] : "",
          };
        }
        return { ...r, ...patch };
      })
    );
  };

  const updateValue = (id: string, value: string | number | string[]) => {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const addRule = () => {
    setDraft((prev) => [...prev, makeDefaultRule()]);
  };

  const removeRule = (id: string) => {
    setDraft((prev) =>
      prev.length === 1 ? [makeDefaultRule()] : prev.filter((r) => r.id !== id)
    );
  };

  const handleApply = () => {
    setFilterRules(draft);
    clearNavFilter();
    closeAllOverlays();
  };

  const handleClear = () => {
    setFilterRules([]);
    clearNavFilter();
    closeAllOverlays();
  };

  return (
    <GenericModal overlay={Overlay.FilterModal}>
      <div className={styles.header}>
        <span className={styles.title}>Custom Filter</span>
        <span className={styles.subtitle}>
          Shows the currently applied rules (from charts or the custom filter).
          Rules combine with AND/OR; toggling NOT inverts an individual rule.
        </span>
      </div>

      <div className={styles.ruleList}>
        {draft.map((rule, index) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            index={index}
            allTags={allTags}
            allGroups={allGroups}
            onChange={(patch) => updateRule(rule.id, patch)}
            onValueChange={(value) => updateValue(rule.id, value)}
            onRemove={() => removeRule(rule.id)}
          />
        ))}
      </div>

      <div className={styles.addRow}>
        <Button size="sm" variant="outline" onClick={addRule}>
          <FiPlus /> Add Rule
        </Button>
        <span className={styles.matchHint}>
          {matchCount} items match
        </span>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="ghost" onClick={closeAllOverlays}>
            Cancel
          </Button>
          <Button data-primary="true" colorPalette="green" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </GenericModal>
  );
};
