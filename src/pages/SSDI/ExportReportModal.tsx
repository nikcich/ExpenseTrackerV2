import { useState } from "react";
import styles from "./SSDI.module.scss";

type Props = {
  years: number[];
  defaultYear: number;
  onClose: () => void;
  onExport: (fromYear: number, toYear: number) => void;
};

export function ExportReportModal({ years, defaultYear, onClose, onExport }: Props) {
  const [fromYear, setFromYear] = useState(defaultYear);
  const [toYear, setToYear] = useState(defaultYear);

  const latest = years[years.length - 1];
  const earliest = years[0];

  const applyPreset = (count: number) => {
    setToYear(latest);
    setFromYear(Math.max(earliest, latest - count + 1));
  };

  const presets: { label: string; count: number }[] = [
    { label: "This year", count: 1 },
    { label: "Last 2 years", count: 2 },
    { label: "Last 5 years", count: 5 },
    { label: "All years", count: years.length ? latest - earliest + 1 : 1 },
  ];

  const handleFrom = (value: number) => {
    setFromYear(value);
    if (value > toYear) setToYear(value);
  };

  const handleTo = (value: number) => {
    setToYear(value);
    if (value < fromYear) setFromYear(value);
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Export PDF Report</span>
        </div>

        <div className={styles.presets}>
          {presets.map((p) => (
            <button key={p.label} className={styles.presetButton} onClick={() => applyPreset(p.count)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.modalRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>From year</label>
            <select
              className={styles.fieldInput}
              value={fromYear}
              onChange={(e) => handleFrom(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>To year</label>
            <select
              className={styles.fieldInput}
              value={toYear}
              onChange={(e) => handleTo(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button className={styles.addButton} onClick={() => onExport(fromYear, toYear)}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
