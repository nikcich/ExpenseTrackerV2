import { GenericPage } from "@/components/GenericPage/GenericPage";
import { CheckboxCard, Heading, Switch } from "@chakra-ui/react";
import styles from "./Settings.module.scss";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";
import { useAllTags } from "@/utils/tags";

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
  const disabledTags = useSettingsStore("disabledTags");
  const allTagsSet = useAllTags();

  const isAll = disabledTags.length === 0;

  return (
    <GenericPage title="Settings">
      <Heading>Enabled Tags</Heading>
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
    </GenericPage>
  );
}
