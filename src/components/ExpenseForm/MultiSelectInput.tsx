import { createListCollection, Portal, Select } from "@chakra-ui/react";

interface MultiSelectProps {
  options: SelectOption[];
  value: SelectOption[];
  onChange: (value: SelectOption[]) => void;
  label: string;
  placeholder: string;
}

type SelectOption = {
  value: string;
  label: string;
};

export const MultiSelectInput = ({
  options,
  value,
  onChange,
  label,
  placeholder,
}: MultiSelectProps) => {
  const selectCollection = createListCollection({ items: options });

  const handleSelectChange = (options: SelectOption[]) => {
    onChange(options);
  };

  return (
    <Select.Root
      multiple
      collection={selectCollection}
      size="sm"
      width="100%"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        alignItems: "flex-start",
      }}
      onValueChange={(e) => handleSelectChange(e.items)}
      value={value.map((v) => v.value)}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control width="100%">
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner width="100%">
          <Select.Content width="100%">
            {selectCollection.items.map((option) => (
              <Select.Item item={option} key={option.value}>
                {option.label}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};
