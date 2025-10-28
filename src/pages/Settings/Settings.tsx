import { GenericPage } from "@/components/GenericPage/GenericPage";
import { ALL_EXPENSE_TAGS, ExpenseTag } from "@/types/types";
import { CheckboxCard, Heading, Switch } from "@chakra-ui/react";
import styles from "./Settings.module.scss";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";

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

export function Settings() {
  const enabledTags = useSettingsStore("enabledTags");

  return (
    <GenericPage title="Settings">
      <Heading>Enabled Tags</Heading>
      <div className={styles.switchContainer}>
        <CustomCheckBox
          checked={enabledTags.length === ALL_EXPENSE_TAGS.length}
          label={"All"}
          onChange={(checked) => {
            if (!checked) {
              setSettingsStore((prev) => ({
                ...prev,
                enabledTags: [],
              }));
            } else {
              setSettingsStore((prev) => ({
                ...prev,
                enabledTags: ALL_EXPENSE_TAGS,
              }));
            }
          }}
        />
        {Object.values(ExpenseTag).map((tag) => (
          <CustomCheckBox
            key={tag}
            checked={enabledTags.includes(tag)}
            onChange={(checked) => {
              setSettingsStore((prev) => {
                const tagsArr = checked
                  ? prev.enabledTags.includes(tag)
                    ? prev.enabledTags
                    : [...prev.enabledTags, tag]
                  : prev.enabledTags.filter((t) => t !== tag);

                return {
                  ...prev,
                  enabledTags: tagsArr,
                };
              });
            }}
            label={tag}
          />
        ))}
      </div>
    </GenericPage>
  );
}
