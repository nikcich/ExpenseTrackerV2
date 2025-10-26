import { GenericPage } from "@/components/GenericPage/GenericPage";
import { Tag } from "@/types/types";
import { CheckboxCard, Heading, Switch } from "@chakra-ui/react";
import styles from "./Settings.module.scss";
import { setSettingsStore, useSettingsStore } from "@/store/SettingsStore";

export function Settings() {
  const enabledTags = useSettingsStore("enabledTags");

  return (
    <GenericPage title="Settings">
      <Heading>Enabled Tags</Heading>
      <div className={styles.switchContainer}>
        {Object.values(Tag).map((tag) => (
          <CheckboxCard.Root>
            <CheckboxCard.Control>
              <CheckboxCard.Content>
                <Switch.Root
                  colorPalette={"blue"}
                  defaultChecked={enabledTags.includes(tag)}
                  onCheckedChange={(changes) => {
                    setSettingsStore((prev) => {
                      const tagsArr = changes.checked
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
                >
                  <Switch.HiddenInput />
                  <Switch.Control />
                  <Switch.Label>{tag}</Switch.Label>
                </Switch.Root>
              </CheckboxCard.Content>
            </CheckboxCard.Control>
          </CheckboxCard.Root>
        ))}
      </div>
    </GenericPage>
  );
}
