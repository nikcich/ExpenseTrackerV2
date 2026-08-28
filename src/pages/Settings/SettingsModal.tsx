import { useState } from "react";
import { GenericModal } from "@/components/GenericModal/GenericModal";
import { Overlay, closeAllOverlays } from "@/store/OverlayStore";
import { CheckboxCard, Heading, Switch, Text, Button } from "@chakra-ui/react";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";
import { setMockMode } from "@/utils/utils";
import { useAllGroups, useAllTags } from "@/utils/tags";
import { useHasRsuData, useHasSsdiData, useSsdiConfig } from "@/store/store";
import { exportAllData, importAllData } from "@/utils/download";
import { toaster } from "@/components/ui/toaster";
import { FiX } from "react-icons/fi";
import styles from "./Settings.module.scss";

const CustomCheckBox = ({
  checked,
  onChange,
  label,
}: {
  checked?: boolean;
  onChange: (e: boolean) => void;
  label: string;
}) => {
  return (
    <CheckboxCard.Root className={styles.switchItem}>
      <CheckboxCard.Control>
        <CheckboxCard.Content>
          <Switch.Root
            colorPalette={"blue"}
            defaultChecked={checked}
            checked={checked}
            onCheckedChange={(changes) => onChange(changes.checked)}
          >
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>{label}</Switch.Label>
          </Switch.Root>
        </CheckboxCard.Content>
      </CheckboxCard.Control>
    </CheckboxCard.Root>
  );
};

type SectionId =
  | "general"
  | "data"
  | "navigation"
  | "display"
  | "anomaly"
  | "categorization";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "data", label: "Data" },
  { id: "navigation", label: "Navigation" },
  { id: "display", label: "Display" },
  { id: "anomaly", label: "Anomalies" },
  { id: "categorization", label: "Categorization" },
];

export function SettingsModal() {
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const disabledTags = useSettingsStore("disabledTags");
  const disabledGroups = useSettingsStore("disabledGroups");
  const mockDataEnabled = useSettingsStore("mockDataEnabled");
  const rsuTabEnabled = useSettingsStore("rsuTabEnabled");
  const ssdiTabEnabled = useSettingsStore("ssdiTabEnabled");
  const anomalyMultiplier = useSettingsStore("anomalyMultiplier");
  const anomalyMinOver = useSettingsStore("anomalyMinOver");
  const anomalyWindow = useSettingsStore("anomalyWindow");
  const compactAmounts = useSettingsStore("compactAmounts");
  const allTagsSet = useAllTags();
  const allGroups = useAllGroups();
  const hasRsuData = useHasRsuData();
  const hasSsdiData = useHasSsdiData();
  const { config: ssdiConfig, saveConfig: saveSsdiConfig } = useSsdiConfig();
  const currentYear = new Date().getFullYear();
  const sgaAmount = ssdiConfig?.sgaByYear?.[currentYear] ?? 1620;

  const isAll = disabledTags.length === 0;

  const activeLabel =
    SECTIONS.find((s) => s.id === activeSection)?.label ?? "General";

  return (
    <GenericModal overlay={Overlay.SettingsModal} fullscreen>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`${styles.tab} ${
                activeSection === s.id ? styles.tabActive : ""
              }`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.contentArea}>
          <div className={styles.header}>
            <Heading size="md">{activeLabel}</Heading>
            <button
              className={styles.closeBtn}
              onClick={closeAllOverlays}
              aria-label="Close settings"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className={styles.body}>
            {activeSection === "general" && (
              <div>
                <Heading size="sm" mb={2}>Mock Data</Heading>
                <CheckboxCard.Root>
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <Switch.Root
                        colorPalette={"blue"}
                        checked={mockDataEnabled}
                        onCheckedChange={(changes) => {
                          const enabled = changes.checked;
                          setMockMode(enabled);
                          setSettingsStore((prev) => ({
                            ...prev,
                            mockDataEnabled: enabled,
                          }));
                        }}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                        <Switch.Label>Enable mock data</Switch.Label>
                      </Switch.Root>
                    </CheckboxCard.Content>
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
                <Text fontSize="sm" color="fg.muted" mt={2}>
                  When enabled, all charts and pages show fake sample data instead of real stored expenses. Useful for screenshots and demos.
                </Text>
              </div>
            )}

            {activeSection === "data" && (
              <div>
                <Heading size="sm" mb={2}>Data Management</Heading>
                <Text fontSize="sm" color="fg.muted" mb={3}>
                  Export all your data (expenses, RSU, accounts, forecast config, CSV definitions) to a single JSON file, or import from a previous backup.
                </Text>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="green"
                    onClick={async () => {
                      try {
                        const path = await exportAllData();
                        if (path) {
                          toaster.create({
                            title: "Export complete",
                            description: `Saved to ${path}`,
                            type: "success",
                          });
                        }
                      } catch (e) {
                        toaster.create({
                          title: "Export failed",
                          description: String(e),
                          type: "error",
                        });
                      }
                    }}
                  >
                    Export All Data
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="blue"
                    onClick={async () => {
                      try {
                        const keys = await importAllData();
                        if (keys.length > 0) {
                          toaster.create({
                            title: "Import complete",
                            description: `Imported: ${keys.join(", ")}`,
                            type: "success",
                          });
                        }
                      } catch (e) {
                        toaster.create({
                          title: "Import failed",
                          description: String(e),
                          type: "error",
                        });
                      }
                    }}
                  >
                    Import Data
                  </Button>
                </div>
              </div>
            )}

            {activeSection === "navigation" && (
              <div>
                <Heading size="sm" mb={2}>Navigation</Heading>
                <CheckboxCard.Root>
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <Switch.Root
                        colorPalette={"blue"}
                        checked={rsuTabEnabled || hasRsuData}
                        disabled={hasRsuData}
                        onCheckedChange={(changes) => {
                          setSettingsStore((prev) => ({
                            ...prev,
                            rsuTabEnabled: changes.checked,
                          }));
                        }}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                        <Switch.Label>Show RSU tab</Switch.Label>
                      </Switch.Root>
                    </CheckboxCard.Content>
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
                <Text fontSize="sm" color="fg.muted" mt={2}>
                  {hasRsuData
                    ? "RSU tab is always visible when you have RSU data."
                    : "RSU tab is hidden by default. Enable it here or add RSU data to make it appear."}
                </Text>

                <CheckboxCard.Root mt={3}>
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <Switch.Root
                        colorPalette={"blue"}
                        checked={ssdiTabEnabled || hasSsdiData}
                        disabled={hasSsdiData}
                        onCheckedChange={(changes) => {
                          setSettingsStore((prev) => ({
                            ...prev,
                            ssdiTabEnabled: changes.checked,
                          }));
                        }}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                        <Switch.Label>Show SSDI tab</Switch.Label>
                      </Switch.Root>
                    </CheckboxCard.Content>
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
                <Text fontSize="sm" color="fg.muted" mt={2}>
                  {hasSsdiData
                    ? "SSDI tab is always visible when you have SSDI data."
                    : "SSDI tab is hidden by default. Enable it here or add SSDI data to make it appear."}
                </Text>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
                  <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">SGA Monthly Amount</Text>
                  <input
                    type="number"
                    className={styles.numberInput}
                    style={{ width: "130px" }}
                    value={sgaAmount}
                    onChange={(e) => {
                      const newSga = parseFloat(e.target.value) || 0;
                      saveSsdiConfig({
                        ...(ssdiConfig ?? { year: currentYear, sgaByYear: {} }),
                        sgaByYear: { ...ssdiConfig?.sgaByYear, [currentYear]: newSga },
                      });
                    }}
                  />
                </div>
              </div>
            )}

            {activeSection === "display" && (
              <div>
                <Heading size="sm" mb={2}>Display</Heading>
                <CheckboxCard.Root>
                  <CheckboxCard.Control>
                    <CheckboxCard.Content>
                      <Switch.Root
                        colorPalette={"blue"}
                        checked={compactAmounts}
                        onCheckedChange={(changes) => {
                          setSettingsStore((prev) => ({
                            ...prev,
                            compactAmounts: changes.checked,
                          }));
                        }}
                      >
                        <Switch.HiddenInput />
                        <Switch.Control />
                        <Switch.Label>Compact amounts</Switch.Label>
                      </Switch.Root>
                    </CheckboxCard.Content>
                  </CheckboxCard.Control>
                </CheckboxCard.Root>
                <Text fontSize="sm" color="fg.muted" mt={2}>
                  Show large amounts in the data table in compact form (e.g. $1.2k instead of $1,200).
                </Text>
              </div>
            )}

            {activeSection === "anomaly" && (
              <div>
                <Heading size="sm" mb={2}>Anomaly Detection</Heading>
                <Text fontSize="sm" color="fg.muted" mb={3}>
                  A category's month is flagged when its total exceeds the multiplier
                  × normal, or is more than the dollar amount over normal — where
                  "normal" is the median of the trailing N months.
                </Text>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">Multiplier (× normal)</Text>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      className={styles.numberInput}
                      value={anomalyMultiplier}
                      onChange={(e) => {
                        setSettingsStore((prev) => ({
                          ...prev,
                          anomalyMultiplier: parseFloat(e.target.value) || 0,
                        }));
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">$ over normal</Text>
                    <input
                      type="number"
                      min="0"
                      className={styles.numberInput}
                      value={anomalyMinOver}
                      onChange={(e) => {
                        setSettingsStore((prev) => ({
                          ...prev,
                          anomalyMinOver: parseFloat(e.target.value) || 0,
                        }));
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">Window (months)</Text>
                    <input
                      type="number"
                      min="1"
                      className={styles.numberInput}
                      value={anomalyWindow}
                      onChange={(e) => {
                        setSettingsStore((prev) => ({
                          ...prev,
                          anomalyWindow: parseFloat(e.target.value) || 1,
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "categorization" && (
              <div>
                <Heading size="sm" mb={2}>Enabled Tags</Heading>
                <Text fontSize="sm" color="fg.muted" mb={3}>
                  Disabled tags are excluded from Overview and chart pages.
                </Text>
                <div className={styles.switchContainer}>
                  <CustomCheckBox
                    checked={isAll}
                    label={"All"}
                    onChange={(checked) => {
                      if (checked) {
                        setSettingsStore((prev) => ({
                          ...prev,
                          disabledTags: [],
                        }));
                      } else {
                        setSettingsStore((prev) => ({
                          ...prev,
                          disabledTags: [...allTagsSet],
                        }));
                      }
                    }}
                  />
                  {[...allTagsSet].map((tag) => (
                    <CustomCheckBox
                      key={tag}
                      checked={!disabledTags.includes(tag)}
                      onChange={(checked) => {
                        setSettingsStore((prev) => {
                          const tagsArr = !checked
                            ? prev.disabledTags.includes(tag)
                              ? prev.disabledTags
                              : [...prev.disabledTags, tag]
                            : prev.disabledTags.filter((t) => t !== tag);

                          return {
                            ...prev,
                            disabledTags: tagsArr,
                          };
                        });
                      }}
                      label={tag}
                    />
                  ))}
                </div>

                <Heading size="sm" my={4}>Enabled Groups</Heading>
                <Text fontSize="sm" color="fg.muted" mb={3}>
                  Disabled groups are excluded from Overview and chart pages.
                </Text>
                {allGroups.length === 0 ? (
                  <Text fontSize="sm" color="fg.subtle">
                    No groups exist yet.
                  </Text>
                ) : (
                  <div className={styles.switchContainer}>
                    {allGroups.map((group) => (
                      <CustomCheckBox
                        key={group}
                        checked={!disabledGroups.includes(group)}
                        onChange={(checked) => {
                          setSettingsStore((prev) => {
                            const groupsArr = !checked
                              ? prev.disabledGroups.includes(group)
                                ? prev.disabledGroups
                                : [...prev.disabledGroups, group]
                              : prev.disabledGroups.filter((g) => g !== group);

                            return {
                              ...prev,
                              disabledGroups: groupsArr,
                            };
                          });
                        }}
                        label={group}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </GenericModal>
  );
}

