import { Button, Input, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { ALL_TAGS_OPTIONS, Expense, Tag } from "@/types/types";
import { format, parse } from "date-fns";
import { MultiSelectInput } from "./MultiSelectInput";

export const ExpenseForm = ({
  expense,
  onSubmit,
  type = "edit",
}: {
  expense: Expense | undefined;
  onSubmit: (partial: Partial<Expense>) => void;
  type: "edit" | "create";
}) => {
  const [date, setDate] = useState(
    expense?.date ? format(new Date(expense?.date), "yyyy-MM-dd") : ""
  );
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [tags, setTags] = useState<string[]>(expense?.tags ?? []);

  const onFormSubmit = useCallback(
    (dt: string, a: number, d: string, t: string[]) => {
      const fmtDate = parse(dt, "yyyy-MM-dd", new Date());
      const formattedDateTime = format(fmtDate, "yyyy-MM-dd'T'HH:mm:ss");

      const partial: Partial<Expense> = {
        date: formattedDateTime,
        amount: a,
        description: d,
        tags: (t as Tag[]) ?? [],
      };
      onSubmit(partial);
    },
    []
  );

  const isFormDirty = () => {
    if (!expense) return true;

    const dirty =
      date !== format(new Date(expense.date), "yyyy-MM-dd") ||
      amount !== expense.amount ||
      description !== expense.description ||
      !tags.every((v) => expense.tags.includes(v as Tag));

    return dirty;
  };

  const isFormValid = () => {
    return date !== "" && amount !== 0 && description !== "";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        alignItems: "flex-start",
      }}
    >
      <Text>Date</Text>

      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        placeholder="Date"
      />
      <Text>Amount</Text>

      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        placeholder="Amount"
        min={-Infinity}
        max={Infinity}
      />

      <Text>Description</Text>
      <Input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />

      <MultiSelectInput
        options={ALL_TAGS_OPTIONS}
        value={ALL_TAGS_OPTIONS.filter((o) => tags.includes(o.value))}
        onChange={(v) => {
          setTags(v.map((option) => option.value));
        }}
        label="Tags"
        placeholder="Select Tags"
      />

      <Button
        colorPalette="green"
        onClick={() => onFormSubmit(date, amount, description, tags)}
        disabled={!isFormDirty() || !isFormValid()}
        style={{ width: "100%" }}
      >
        {type === "create" ? "Create" : "Save"}
      </Button>
    </div>
  );
};
