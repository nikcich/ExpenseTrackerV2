import { Button, Checkbox, Table } from "@chakra-ui/react";
import { useState } from "react";
import { Expense, Tag } from "@/types/types";
import { BrushScrubber } from "../Brush/BrushScrubber";
import { GenericPage } from "../GenericPage/GenericPage";
import { useExpenses } from "@/hooks/expenses";
import { Tag as TagComp } from "@chakra-ui/react";

const TagCell = ({ tags }: { tags: Tag[] }) => {
  return (
    <div>
      {tags.map((tag) => (
        <TagComp.Root key={tag} colorPalette={"blue"}>
          <TagComp.Label>{tag}</TagComp.Label>
        </TagComp.Root>
      ))}
    </div>
  );
};

export const DataTable = ({ items }: { items: Expense[] }) => {
  const [selection, setSelection] = useState<string[]>([]);
  const indeterminate = selection.length > 0 && selection.length < items.length;
  const unfilteredExpenses = useExpenses();

  const rows = items.map((item) => (
    <Table.Row
      key={item.id}
      data-selected={selection.includes(item.id) ? "" : undefined}
    >
      <Table.Cell>
        <Checkbox.Root
          size="sm"
          mt="0.5"
          aria-label="Select row"
          checked={selection.includes(item.id)}
          onCheckedChange={(changes) => {
            setSelection((prev) =>
              changes.checked
                ? [...prev, item.id]
                : selection.filter((name) => name !== item.id)
            );
          }}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
        </Checkbox.Root>
      </Table.Cell>
      <Table.Cell>
        <TagCell tags={item.tags} />
      </Table.Cell>

      <Table.Cell>{item.date}</Table.Cell>
      <Table.Cell>{item.description}</Table.Cell>
      <Table.Cell>${item.amount}</Table.Cell>
    </Table.Row>
  ));

  return (
    <GenericPage
      title={`Expenses (${items.length})`}
      actions={
        <>
          {selection.length > 0 && (
            <>
              <Button size={"xs"} colorPalette={"red"}>
                Delete Selection
              </Button>

              <Button size={"xs"} colorPalette={"blue"}>
                Modify Selection
              </Button>
            </>
          )}
        </>
      }
      footer={<BrushScrubber expenses={unfilteredExpenses} />}
    >
      <Table.Root variant={"line"} striped stickyHeader>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="6">
              <Checkbox.Root
                size="sm"
                mt="0.5"
                aria-label="Select all rows"
                checked={indeterminate ? "indeterminate" : selection.length > 0}
                onCheckedChange={(changes) => {
                  setSelection(
                    changes.checked ? items.map((item) => item.id) : []
                  );
                }}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
              </Checkbox.Root>
            </Table.ColumnHeader>
            <Table.ColumnHeader>Tags</Table.ColumnHeader>

            <Table.ColumnHeader>Date</Table.ColumnHeader>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader>Amount</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>{rows}</Table.Body>
      </Table.Root>
    </GenericPage>
  );
};
