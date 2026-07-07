import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  CashFlowEvent,
  PayPeriod,
  IncomeRule,
  ExpenseRule,
  computeCashFlowForecast,
} from "@/utils/cash-flow-forecast";
import { useForecastConfig } from "@/store/store";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/utils";
import styles from "./Forecast.module.scss";
import { GenericPage } from "@/components/GenericPage/GenericPage";

const cleanNum = (v: string) => String(Number(v));

const DEFAULT_CONFIG = {
  startBalance: 0,
  reserve: 0,
  startDate: "",
  endDate: "",
};

export function Forecast() {
  const [startBalance, setStartBalance] = useState(DEFAULT_CONFIG.startBalance);
  const [reserve, setReserve] = useState(DEFAULT_CONFIG.reserve);
  const [startDate, setStartDate] = useState(DEFAULT_CONFIG.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_CONFIG.endDate);
  const [sections, setSections] = useState({ general: true, income: true, expenses: true });
  const toggleSection = (key: keyof typeof sections) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [incomeStreams, setIncomeStreams] = useState<IncomeRule[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRule[]>([]);

  const { config: savedConfig, loaded, saveConfig } = useForecastConfig();
  const initialized = useRef(false);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    if (!loaded) return;
    if (!initialized.current) {
      initialized.current = true;
    }
    if (!savedConfig) return;
    const key = JSON.stringify(savedConfig);
    if (key === lastSavedRef.current) return;
    lastSavedRef.current = key;
    setStartBalance(savedConfig.startBalance);
    setReserve(savedConfig.reserve);
    setStartDate(savedConfig.startDate);
    setEndDate(savedConfig.endDate);
    if (savedConfig.incomeStreams) {
      setIncomeStreams(
        savedConfig.incomeStreams.map((s) => ({
          ...s,
          payPeriod: s.payPeriod as PayPeriod,
        }))
      );
    }
    if (savedConfig.expenses) {
      setExpenses(
        savedConfig.expenses.map((e) => ({
          ...e,
          period: e.period as PayPeriod,
        }))
      );
    }
  }, [savedConfig, loaded]);

  useEffect(() => {
    if (!initialized.current) return;
    const key = JSON.stringify({ startBalance, reserve, startDate, endDate, incomeStreams, expenses });
    if (key === lastSavedRef.current) return;
    saveConfig({ startBalance, reserve, startDate, endDate, incomeStreams, expenses });
    lastSavedRef.current = key;
  }, [startBalance, reserve, startDate, endDate, incomeStreams, expenses, saveConfig]);

  const updateIncome = useCallback((index: number, field: string, value: string | number) => {
    setIncomeStreams((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  }, []);

  const removeIncome = useCallback((index: number) => {
    setIncomeStreams((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addIncome = useCallback(() => {
    const defaultDate = format(new Date(), "yyyy-MM-dd");
    setIncomeStreams((prev) => [
      ...prev,
      { amount: 0, payPeriod: "biweekly", firstPaycheckDate: defaultDate, semimonthlyPayday1: 1, semimonthlyPayday2: 15 },
    ]);
  }, []);

  const updateExpense = useCallback(
    (index: number, field: keyof ExpenseRule, value: string | number) => {
      setExpenses((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          [field]: field === "day" ? Math.min(31, Math.max(1, Number(value))) : value,
        };
        return next;
      });
    },
    [],
  );

  const removeExpense = useCallback((index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addExpense = useCallback(() => {
    const defaultDate = format(new Date(), "yyyy-MM-dd");
    setExpenses((prev) => [...prev, { day: 1, amount: 0, firstDate: defaultDate }]);
  }, []);

  const result = useMemo(
    () => computeCashFlowForecast({ startBalance, reserve, startDate, endDate, incomeStreams, expenses }),
    [startBalance, reserve, startDate, endDate, incomeStreams, expenses],
  );

  const eventColorClass = (event: CashFlowEvent): string => {
    if (event.type === "income") return styles.eventIncome;
    if (event.type === "expense") return styles.eventExpense;
    if (event.type === "transfer") return styles.eventTransfer;
    return "";
  };

  if (!loaded) {
    return (
      <GenericPage title="Forecast" hasRange={false} needsData={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "2rem" }}>
          <span style={{ color: "var(--fg-muted, #a0a0ab)" }}>Loading...</span>
        </div>
      </GenericPage>
    );
  }

  return (
    <GenericPage title="Forecast" hasRange={false} needsData={false}>
      <div className={styles.page}>
        <div className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection("general")}>
            <span className={`${styles.chevron} ${sections.general ? styles.chevronOpen : ""}`}>▶</span>
            <span className={styles.sectionTitle}>General</span>
          </div>
          {sections.general && (
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Starting Balance</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  inputMode="decimal"
                  value={startBalance}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!isNaN(num)) setStartBalance(num);
                  }}
                  onBlur={(e) => setStartBalance(Number(cleanNum(e.target.value)))}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Reserve Amount</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  inputMode="decimal"
                  value={reserve}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    if (!isNaN(num)) setReserve(num);
                  }}
                  onBlur={(e) => setReserve(Number(cleanNum(e.target.value)))}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Start Date</span>
                <input className={styles.fieldInput} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>End Date</span>
                <input className={styles.fieldInput} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection("income")}>
            <span className={`${styles.chevron} ${sections.income ? styles.chevronOpen : ""}`}>▶</span>
            <span className={styles.sectionTitle}>Income</span>
          </div>
          {sections.income && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {incomeStreams.map((stream, i) => (
                <div key={i} className={styles.ruleRow}>
                  <div className={styles.field} style={{ minWidth: "120px", flex: "0.8" }}>
                    <span className={styles.fieldLabel}>Name</span>
                    <input className={styles.fieldInput} type="text" value={stream.name || ""} onChange={(e) => updateIncome(i, "name", e.target.value)} placeholder="e.g. Salary" />
                  </div>
                  <div className={styles.field} style={{ minWidth: "100px", flex: "0.6" }}>
                    <span className={styles.fieldLabel}>Amount</span>
                    <input className={styles.fieldInput} type="text" inputMode="decimal" value={stream.amount} onChange={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) updateIncome(i, "amount", num);
                    }} />
                  </div>
                  <div className={styles.field} style={{ minWidth: "130px", flex: "0.7" }}>
                    <span className={styles.fieldLabel}>Period</span>
                    <select className={styles.fieldInput} value={stream.payPeriod} onChange={(e) => updateIncome(i, "payPeriod", e.currentTarget.value)}>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="weekly">Weekly</option>
                      <option value="semimonthly">Semi-monthly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semi-annual</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div className={styles.field} style={{ minWidth: "130px", flex: "0.7" }}>
                    <span className={styles.fieldLabel}>First Date</span>
                    <input className={styles.fieldInput} type="date" value={stream.firstPaycheckDate} onChange={(e) => updateIncome(i, "firstPaycheckDate", e.target.value)} />
                  </div>
                  {stream.payPeriod === "semimonthly" && (
                    <>
                      <div className={styles.field} style={{ minWidth: "50px", flex: "0.3" }}>
                        <span className={styles.fieldLabel}>Day 1</span>
                        <input className={styles.fieldInput} type="text" inputMode="numeric" value={stream.semimonthlyPayday1} onChange={(e) => {
                          const num = Number(e.target.value);
                          if (!isNaN(num)) updateIncome(i, "semimonthlyPayday1", Math.min(31, Math.max(1, num)));
                        }} />
                      </div>
                      <div className={styles.field} style={{ minWidth: "50px", flex: "0.3" }}>
                        <span className={styles.fieldLabel}>Day 2</span>
                        <input className={styles.fieldInput} type="text" inputMode="numeric" value={stream.semimonthlyPayday2} onChange={(e) => {
                          const num = Number(e.target.value);
                          if (!isNaN(num)) updateIncome(i, "semimonthlyPayday2", Math.min(31, Math.max(1, num)));
                        }} />
                      </div>
                    </>
                  )}
                  <div className={styles.field} style={{ minWidth: "130px", flex: "0.7" }}>
                    <span className={styles.fieldLabel}>End Date</span>
                    <input className={styles.fieldInput} type="date" value={stream.endDate || ""} onChange={(e) => updateIncome(i, "endDate", e.target.value)} />
                  </div>
                  <button className={styles.deleteBtn} onClick={() => removeIncome(i)}>✖</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addIncome}>+ Add Income</button>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection("expenses")}>
            <span className={`${styles.chevron} ${sections.expenses ? styles.chevronOpen : ""}`}>▶</span>
            <span className={styles.sectionTitle}>Expenses</span>
          </div>
          {sections.expenses && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {expenses.map((exp, i) => (
                <div key={i} className={styles.ruleRow}>
                  <div className={styles.field} style={{ minWidth: "120px", flex: "0.8" }}>
                    <span className={styles.fieldLabel}>Name</span>
                    <input className={styles.fieldInput} type="text" value={exp.name || ""} onChange={(e) => updateExpense(i, "name", e.target.value)} placeholder="e.g. Rent" />
                  </div>
                  <div className={styles.field} style={{ minWidth: "130px", flex: "0.7" }}>
                    <span className={styles.fieldLabel}>First Date</span>
                    <input className={styles.fieldInput} type="date" value={exp.firstDate || ""} onChange={(e) => updateExpense(i, "firstDate", e.target.value)} />
                  </div>
                  <div className={styles.field} style={{ minWidth: "80px", flex: "0.5" }}>
                    <span className={styles.fieldLabel}>Amount</span>
                    <input className={styles.fieldInput} type="text" inputMode="decimal" value={exp.amount} onChange={(e) => {
                      const num = Number(e.target.value);
                      if (!isNaN(num)) updateExpense(i, "amount", num);
                    }} />
                  </div>
                  <div className={styles.field} style={{ minWidth: "120px", flex: "0.6" }}>
                    <span className={styles.fieldLabel}>Period</span>
                    <select className={styles.fieldInput} value={exp.period || "monthly"} onChange={(e) => {
                      const newPeriod = e.currentTarget.value;
                      updateExpense(i, "period", newPeriod);
                      if (!exp.firstDate) {
                        updateExpense(i, "firstDate", format(new Date(), "yyyy-MM-dd"));
                      }
                    }}>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="semiannual">Semi-annual</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div className={styles.field} style={{ minWidth: "130px", flex: "0.7" }}>
                    <span className={styles.fieldLabel}>End Date</span>
                    <input className={styles.fieldInput} type="date" value={exp.endDate || ""} onChange={(e) => updateExpense(i, "endDate", e.target.value)} />
                  </div>
                  <button className={styles.deleteBtn} onClick={() => removeExpense(i)}>✖</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addExpense}>+ Add Expense</button>
            </div>
          )}
        </div>

        {result.events.length > 0 && (
          <>
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Change</th>
                    <th>Checking</th>
                    <th>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {result.events.map((ev, i) => (
                    <tr key={i}>
                      <td>{ev.date}</td>
                      <td>{ev.event}</td>
                      <td className={eventColorClass(ev)}>
                        {ev.change !== null
                          ? (ev.change >= 0 ? "+" : "") + formatCurrency(ev.change)
                          : ""}
                      </td>
                      <td>{formatCurrency(ev.checking)}</td>
                      <td>{formatCurrency(ev.savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.events.length === 0 && (
                <div className={styles.emptyRow}>No forecast events</div>
              )}
            </div>

            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryCardLabel}>Total Income</span>
                <span className={`${styles.summaryCardValue} ${styles.valuePos}`}>
                  {formatCurrency(result.summary.totalIncome)}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryCardLabel}>Total Expenses</span>
                <span className={`${styles.summaryCardValue} ${styles.valueNeg}`}>
                  {formatCurrency(result.summary.totalExpenses)}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryCardLabel}>Ending Checking</span>
                <span className={`${styles.summaryCardValue} ${result.summary.endingChecking >= 0 ? styles.valuePos : styles.valueNeg}`}>
                  {formatCurrency(result.summary.endingChecking)}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryCardLabel}>Ending Savings</span>
                <span className={`${styles.summaryCardValue} ${styles.valueNeutral}`}>
                  {formatCurrency(result.summary.endingSavings)}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryCardLabel}>Lowest Checking</span>
                <span className={`${styles.summaryCardValue} ${result.summary.lowestChecking >= 0 ? styles.valuePos : styles.valueNeg}`}>
                  {formatCurrency(result.summary.lowestChecking)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </GenericPage>
  );
}
