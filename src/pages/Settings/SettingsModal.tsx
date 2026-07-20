import { GenericModal } from "@/components/GenericModal/GenericModal";
import { Overlay, closeAllOverlays } from "@/store/OverlayStore";
import { CheckboxCard, Heading, Switch, Separator, Text, Button } from "@chakra-ui/react";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";
import { setMockMode } from "@/utils/utils";
import { useAllTags } from "@/utils/tags";
import { useHasRsuData } from "@/store/store";
import { exportAllData, importAllData } from "@/utils/download";
import { toaster } from "@/components/ui/toaster";
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

export function SettingsModal() {
  const disabledTags = useSettingsStore("disabledTags");
  const mockDataEnabled = useSettingsStore("mockDataEnabled");
  const rsuTabEnabled = useSettingsStore("rsuTabEnabled");
  const allTagsSet = useAllTags();
  const hasRsuData = useHasRsuData();

  const isAll = disabledTags.length === 0;

  return (
    <GenericModal overlay={Overlay.SettingsModal}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Heading size="md">Settings</Heading>
          <button
            onClick={closeAllOverlays}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color, #32323c)",
              color: "var(--fg-muted, #a0a0ab)",
              borderRadius: "0.35rem",
              padding: "0.25rem 0.6rem",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Close
          </button>
        </div>

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
          <Text fontSize="sm" color="fg.muted" mt={1}>
            When enabled, all charts and pages show fake sample data instead of real stored expenses. Useful for screenshots and demos.
          </Text>
        </div>

        <Separator />

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

        <Separator />

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
          <Text fontSize="sm" color="fg.muted" mt={1}>
            {hasRsuData
              ? "RSU tab is always visible when you have RSU data."
              : "RSU tab is hidden by default. Enable it here or add RSU data to make it appear."}
          </Text>
        </div>

        <Separator />

        <div>
          <Heading size="sm" mb={2}>Enabled Tags</Heading>
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
        </div>
      </div>
    </GenericModal>
  );
}
