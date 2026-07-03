import { GenericModal } from "@/components/GenericModal/GenericModal";
import { Overlay } from "@/store/OverlayStore";
import { CheckboxCard, Heading, Switch } from "@chakra-ui/react";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";
import { useAllTags } from "@/utils/tags";
import { closeAllOverlays } from "@/store/OverlayStore";
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
    <CheckboxCard.Root>
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
  const allTagsSet = useAllTags();

  const isAll = disabledTags.length === 0;

  return (
    <GenericModal overlay={Overlay.SettingsModal}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Heading size="md">Enabled Tags</Heading>
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
    </GenericModal>
  );
}
