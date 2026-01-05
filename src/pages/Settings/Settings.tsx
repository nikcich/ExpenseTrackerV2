import { GenericPage } from "@/components/GenericPage/GenericPage";
import { ALL_EXPENSE_TAGS, ExpenseTag, NonExpenseTags } from "@/types/types";
import { CheckboxCard, Heading, Separator, Switch } from "@chakra-ui/react";
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

  const includeRSU = enabledTags.includes(NonExpenseTags.RSU);
  const isAll =
    (includeRSU && enabledTags.length === ALL_EXPENSE_TAGS.length + 1) ||
    (!includeRSU && enabledTags.length === ALL_EXPENSE_TAGS.length);

  return (
    <GenericPage title="Settings">
      <Heading>Enabled Tags</Heading>
      <div className={styles.switchContainer}>
        <CustomCheckBox
          checked={isAll}
          label={"All"}
          onChange={(checked) => {
            if (!checked) {
              setSettingsStore((prev) => ({
                ...prev,
                enabledTags: [...(includeRSU ? [NonExpenseTags.RSU] : [])],
              }));
            } else {
              setSettingsStore((prev) => ({
                ...prev,
                enabledTags: [
                  ...ALL_EXPENSE_TAGS,
                  ...(includeRSU ? [NonExpenseTags.RSU] : []),
                ],
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

      <Separator />
      <div className={styles.switchContainer}>
        <CustomCheckBox
          checked={enabledTags.includes(NonExpenseTags.RSU)}
          onChange={(checked) => {
            setSettingsStore((prev) => {
              const tagsArr = checked
                ? prev.enabledTags.includes(NonExpenseTags.RSU)
                  ? prev.enabledTags
                  : [...prev.enabledTags, NonExpenseTags.RSU]
                : prev.enabledTags.filter((t) => t !== NonExpenseTags.RSU);

              return {
                ...prev,
                enabledTags: tagsArr,
              };
            });
          }}
          label={"Include RSU's"}
        />
      </div>
    </GenericPage>
  );
}
