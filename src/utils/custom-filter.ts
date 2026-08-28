import { Expense } from "@/types/types";
import { getExpenseKind } from "@/utils/expense-utils";
import { parseLocalDate } from "@/utils/utils";
import { expenseMatchesSearch } from "@/utils/search";

export type Conjunction = "AND" | "OR";

export type ChartOpenPayload = {
  category?: string;
  field?: "tags" | "group";
  period: string;
};

export type FilterField =
  | "amount"
  | "date"
  | "description"
  | "tags"
  | "group"
  | "type"
  | "text";

export type FilterOperator = string;

export type FilterValueKind =
  | "number"
  | "date"
  | "text"
  | "select"
  | "multiSelect";

export type FilterOperatorDef = {
  id: string;
  label: string;
  valueKind: FilterValueKind;
};

export type FilterFieldDef = {
  id: FilterField;
  label: string;
  operators: FilterOperatorDef[];
};

export type FilterRule = {
  id: string;
  conjunction: Conjunction;
  negate: boolean;
  field: FilterField;
  operator: FilterOperator;
  value: string | number | string[];
};

export const FILTER_FIELDS: FilterFieldDef[] = [
  {
    id: "text",
    label: "Free Text",
    operators: [
      { id: "contains", label: "matches", valueKind: "text" },
      { id: "ncontains", label: "does not match", valueKind: "text" },
    ],
  },
  {
    id: "amount",
    label: "Amount",
    operators: [
      { id: "eq", label: "is", valueKind: "number" },
      { id: "neq", label: "is not", valueKind: "number" },
      { id: "lt", label: "is less than", valueKind: "number" },
      { id: "lte", label: "is at most", valueKind: "number" },
      { id: "gt", label: "is greater than", valueKind: "number" },
      { id: "gte", label: "is at least", valueKind: "number" },
    ],
  },
  {
    id: "date",
    label: "Date",
    operators: [
      { id: "equals", label: "is", valueKind: "date" },
      { id: "neq", label: "is not", valueKind: "date" },
      { id: "before", label: "is before", valueKind: "date" },
      { id: "after", label: "is after", valueKind: "date" },
    ],
  },
  {
    id: "description",
    label: "Description",
    operators: [
      { id: "contains", label: "contains", valueKind: "text" },
      { id: "ncontains", label: "does not contain", valueKind: "text" },
      { id: "equals", label: "is exactly", valueKind: "text" },
      { id: "neq", label: "is not", valueKind: "text" },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    operators: [
      { id: "any", label: "has any of", valueKind: "multiSelect" },
      { id: "all", label: "has all of", valueKind: "multiSelect" },
      { id: "none", label: "has none of", valueKind: "multiSelect" },
      { id: "empty", label: "has no tags", valueKind: "select" },
      { id: "notEmpty", label: "has tags", valueKind: "select" },
    ],
  },
  {
    id: "group",
    label: "Group",
    operators: [
      { id: "equals", label: "is", valueKind: "select" },
      { id: "neq", label: "is not", valueKind: "select" },
      { id: "empty", label: "has no group", valueKind: "select" },
      { id: "notEmpty", label: "has a group", valueKind: "select" },
    ],
  },
  {
    id: "type",
    label: "Type",
    operators: [
      { id: "equals", label: "is", valueKind: "select" },
      { id: "neq", label: "is not", valueKind: "select" },
    ],
  },
];

const TYPE_OPTIONS = ["Expense", "Income", "Savings", "Untagged"] as const;

export function getFieldDef(field: FilterField): FilterFieldDef | undefined {
  return FILTER_FIELDS.find((f) => f.id === field);
}

export function getOperatorDef(
  field: FilterField,
  operator: FilterOperator
): FilterOperatorDef | undefined {
  return getFieldDef(field)?.operators.find((o) => o.id === operator);
}

export function typeForExpense(e: Expense): string {
  const kind = getExpenseKind(e);
  if (kind === "income") return "Income";
  if (kind === "savings") return "Savings";
  if (e.tags.length === 0) return "Untagged";
  return "Expense";
}

function baseMatch(rule: FilterRule, e: Expense): boolean {
  const value = (v: string | number | string[]) =>
    Array.isArray(v) ? new Set(v) : v;

  switch (rule.field) {
    case "text": {
      const query = String(rule.value);
      return rule.operator === "ncontains"
        ? !expenseMatchesSearch(e, query)
        : expenseMatchesSearch(e, query);
    }
    case "amount": {
      const n = Number(rule.value);
      switch (rule.operator) {
        case "eq":
          return e.amount === n;
        case "neq":
          return e.amount !== n;
        case "lt":
          return e.amount < n;
        case "lte":
          return e.amount <= n;
        case "gt":
          return e.amount > n;
        case "gte":
          return e.amount >= n;
        default:
          return true;
      }
    }
    case "date": {
      const d = parseLocalDate(e.date);
      const v = parseLocalDate(String(rule.value));
      switch (rule.operator) {
        case "equals":
          return d.getTime() === v.getTime();
        case "neq":
          return d.getTime() !== v.getTime();
        case "before":
          return d.getTime() <= v.getTime();
        case "after":
          return d.getTime() >= v.getTime();
        default:
          return true;
      }
    }
    case "description": {
      const needle = String(rule.value).toLowerCase();
      const haystack = e.description.toLowerCase();
      switch (rule.operator) {
        case "contains":
          return haystack.includes(needle);
        case "ncontains":
          return !haystack.includes(needle);
        case "equals":
          return e.description.toLowerCase() === needle;
        case "neq":
          return e.description.toLowerCase() !== needle;
        default:
          return true;
      }
    }
    case "tags": {
      const selected = value(rule.value) as Set<string>;
      switch (rule.operator) {
        case "empty":
          return e.tags.length === 0;
        case "notEmpty":
          return e.tags.length > 0;
        case "any":
          return e.tags.some((t) => selected.has(t));
        case "all":
          return selected.size > 0 && [...selected].every((t) => e.tags.includes(t));
        case "none":
          return !e.tags.some((t) => selected.has(t));
        default:
          return true;
      }
    }
    case "group": {
      const g = e.group ?? "";
      switch (rule.operator) {
        case "empty":
          return !e.group || e.group === "";
        case "notEmpty":
          return !!e.group && e.group !== "";
        case "equals":
          return g === String(rule.value);
        case "neq":
          return g !== String(rule.value);
        default:
          return true;
      }
    }
    case "type": {
      const t = typeForExpense(e);
      switch (rule.operator) {
        case "equals":
          return t === String(rule.value);
        case "neq":
          return t !== String(rule.value);
        default:
          return true;
      }
    }
    default:
      return true;
  }
}

export function matchesRule(rule: FilterRule, e: Expense): boolean {
  const result = baseMatch(rule, e);
  return rule.negate ? !result : result;
}

export function matchesRules(rules: FilterRule[], e: Expense): boolean {
  if (rules.length === 0) return true;
  let acc = matchesRule(rules[0], e);
  for (const rule of rules.slice(1)) {
    const matched = matchesRule(rule, e);
    acc = rule.conjunction === "AND" ? acc && matched : acc || matched;
  }
  return acc;
}

export function parseOptionList(values: string | number | string[]): string[] {
  return Array.isArray(values) ? values.map(String) : values ? [String(values)] : [];
}

export const TYPE_OPTIONS_LIST = [...TYPE_OPTIONS];

export function categoryRule(
  field: "tags" | "group",
  name: string,
  negate = false
): FilterRule {
  return {
    id: `nav_${field}_${name}`,
    conjunction: "AND",
    negate,
    field,
    operator: field === "tags" ? "all" : "equals",
    value: field === "tags" ? [name] : name,
  };
}

export function textRule(query: string): FilterRule {
  return {
    id: "nav_text",
    conjunction: "AND",
    negate: false,
    field: "text",
    operator: "contains",
    value: query,
  };
}

export function emptyGroupRule(negate = false): FilterRule {
  return {
    id: "nav_ungrouped",
    conjunction: "AND",
    negate,
    field: "group",
    operator: "empty",
    value: "",
  };
}

let dateRuleCounter = 0;
export function dateRangeRules(
  startIso: string,
  endIso: string
): FilterRule[] {
  return [
    {
      id: `nav_date_ge_${dateRuleCounter++}`,
      conjunction: "AND",
      negate: false,
      field: "date",
      operator: "after",
      value: startIso,
    },
    {
      id: `nav_date_le_${dateRuleCounter++}`,
      conjunction: "AND",
      negate: false,
      field: "date",
      operator: "before",
      value: endIso,
    },
  ];
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function periodDateRange(
  mode: string,
  label: string
): { start: string; end: string } | undefined {
  const clean = label.replace(/\u200e/g, "").trim();
  if (mode === "MONTHLY") {
    const m = clean.match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (!m) return undefined;
    const monthName = m[1];
    const year = Number(m[2]);
    const month = new Date(
      `${monthName} 1, ${year}`
    ).getMonth();
    if (Number.isNaN(month)) return undefined;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: toIso(start), end: toIso(end) };
  }
  if (mode === "YEARLY") {
    const year = Number(clean);
    if (!Number.isFinite(year)) return undefined;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return { start: toIso(start), end: toIso(end) };
  }
  if (mode === "DAILY") {
    const m = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return undefined;
    const [, mo, day, year] = m;
    const iso = `${year}-${mo}-${day}`;
    return { start: iso, end: iso };
  }
  return undefined;
}

export function rulesFromChartPayload(
  payload: ChartOpenPayload,
  mode: string
): FilterRule[] {
  const rules: FilterRule[] = [];
  if (payload.category && payload.field) {
    if (payload.field === "group" && payload.category === "Ungrouped") {
      rules.push(emptyGroupRule());
    } else if (payload.category !== "Other") {
      rules.push(categoryRule(payload.field, payload.category));
    }
  }
  const range = periodDateRange(mode, payload.period);
  if (range) {
    rules.push(...dateRangeRules(range.start, range.end));
  }
  return rules;
}
