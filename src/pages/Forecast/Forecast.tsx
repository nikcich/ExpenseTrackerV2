import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Text,
  Input,
  Flex,
  Field,
  NativeSelect,
  Button,
} from "@chakra-ui/react";
import {
  CashFlowEvent,
  PayPeriod,
  ExpenseRule,
  computeCashFlowForecast,
} from "@/utils/cash-flow-forecast";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const CFGroup = ({
  label,
  value,
  onChange,
  type = "number",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <Field.Root flex="1" minW="180px">
    <Field.Label fontSize="sm">{label}</Field.Label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="sm"
    />
  </Field.Root>
);

const TableHeader = () => (
  <Flex
    py={2}
    px={4}
    fontWeight="bold"
    borderBottom="1px solid"
    borderColor="gray.600"
    bg="gray.800"
    fontSize="sm"
  >
    <Box w="120px">Date</Box>
    <Box w="180px">Event</Box>
    <Box w="130px" textAlign="right">
      Change
    </Box>
    <Box w="130px" textAlign="right">
      Checking
    </Box>
    <Box w="130px" textAlign="right">
      Savings
    </Box>
  </Flex>
);

const eventColor = (event: string): string => {
  if (event === "Paycheck") return "green.300";
  if (event.startsWith("Expense")) return "red.300";
  if (event === "Savings Transfer") return "yellow.300";
  return "";
};

const TableRow = ({ event }: { event: CashFlowEvent }) => (
  <Flex
    py={1.5}
    px={4}
    borderBottom="1px solid"
    borderColor="gray.700"
    fontSize="sm"
    fontFamily="mono"
    color={eventColor(event.event)}
  >
    <Box w="120px">{event.date}</Box>
    <Box w="180px">{event.event}</Box>
    <Box w="130px" textAlign="right">
      {event.change !== null
        ? (event.change >= 0 ? "+" : "") + formatCurrency(event.change)
        : ""}
    </Box>
    <Box w="130px" textAlign="right">
      {formatCurrency(event.checking)}
    </Box>
    <Box w="130px" textAlign="right">
      {formatCurrency(event.savings)}
    </Box>
  </Flex>
);

const DEFAULT_CONFIG = {
  startBalance: 7800,
  reserve: 8000,
  startDate: "2026-06-01",
  endDate: "2026-12-31",
  paycheckAmount: 4800,
  payPeriod: "biweekly" as PayPeriod,
  firstPaycheckDate: "2026-06-05",
  semimonthlyPayday1: 1,
  semimonthlyPayday2: 15,
};

export function Forecast() {
  const [startBalance, setStartBalance] = useState(DEFAULT_CONFIG.startBalance);
  const [reserve, setReserve] = useState(DEFAULT_CONFIG.reserve);
  const [startDate, setStartDate] = useState(DEFAULT_CONFIG.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_CONFIG.endDate);
  const [paycheckAmount, setPaycheckAmount] = useState(
    DEFAULT_CONFIG.paycheckAmount,
  );
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(
    DEFAULT_CONFIG.payPeriod,
  );
  const [firstPaycheckDate, setFirstPaycheckDate] = useState(
    DEFAULT_CONFIG.firstPaycheckDate,
  );
  const [semimonthlyPayday1, setSemimonthlyPayday1] = useState(
    DEFAULT_CONFIG.semimonthlyPayday1,
  );
  const [semimonthlyPayday2, setSemimonthlyPayday2] = useState(
    DEFAULT_CONFIG.semimonthlyPayday2,
  );
  const [expenses, setExpenses] = useState<ExpenseRule[]>([
    { day: 12, amount: 1500 },
    { day: 20, amount: 3500 },
  ]);

  const updateExpense = useCallback(
    (index: number, field: keyof ExpenseRule, value: number) => {
      setExpenses((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          [field]: field === "day" ? Math.min(31, Math.max(1, value)) : value,
        };
        return next;
      });
    },
    [],
  );

  const removeExpense = useCallback((index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addExpense = useCallback(() => {
    setExpenses((prev) => [...prev, { day: 1, amount: 0 }]);
  }, []);

  const result = useMemo(
    () =>
      computeCashFlowForecast({
        startBalance,
        reserve,
        startDate,
        endDate,
        paycheckAmount,
        payPeriod,
        firstPaycheckDate,
        semimonthlyPayday1,
        semimonthlyPayday2,
        expenses,
      }),
    [
      startBalance,
      reserve,
      startDate,
      endDate,
      paycheckAmount,
      payPeriod,
      firstPaycheckDate,
      semimonthlyPayday1,
      semimonthlyPayday2,
      expenses,
    ],
  );

  return (
    <GenericPage title="Forecast" hasRange={false} needsData={false}>
      <Flex direction="column" h="100%" overflow="hidden" p={4} gap={4}>
        <Flex direction="column" gap={2} flexShrink={0} w="100%">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.300"
            textAlign="left"
          >
            General
          </Text>
          <Flex wrap="wrap" gap={4} alignItems="flex-end">
            <CFGroup
              label="Starting Balance"
              value={startBalance}
              onChange={(v) => setStartBalance(Number(v))}
            />
            <CFGroup
              label="Reserve Amount"
              value={reserve}
              onChange={(v) => setReserve(Number(v))}
            />
            <CFGroup
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              type="date"
            />
            <CFGroup
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              type="date"
            />
          </Flex>
        </Flex>

        <Flex direction="column" gap={2} flexShrink={0} w="100%">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.300"
            textAlign="left"
          >
            Paycheck
          </Text>
          <Flex wrap="wrap" gap={4} alignItems="flex-end">
            <CFGroup
              label="Paycheck Amount"
              value={paycheckAmount}
              onChange={(v) => setPaycheckAmount(Number(v))}
            />
            <Field.Root flex="1" minW="140px">
              <Field.Label fontSize="sm">Pay Period</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={payPeriod}
                  onChange={(e) =>
                    setPayPeriod(e.currentTarget.value as PayPeriod)
                  }
                >
                  <option value="biweekly">Bi-weekly (every 14 days)</option>
                  <option value="weekly">Weekly (every 7 days)</option>
                  <option value="semimonthly">
                    Semi-monthly (fixed dates)
                  </option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            {payPeriod !== "semimonthly" ? (
              <CFGroup
                label="First Paycheck"
                value={firstPaycheckDate}
                onChange={setFirstPaycheckDate}
                type="date"
              />
            ) : (
              <>
                <CFGroup
                  label="Payday 1"
                  value={semimonthlyPayday1}
                  onChange={(v) =>
                    setSemimonthlyPayday1(Math.min(31, Math.max(1, Number(v))))
                  }
                />
                <CFGroup
                  label="Payday 2"
                  value={semimonthlyPayday2}
                  onChange={(v) =>
                    setSemimonthlyPayday2(Math.min(31, Math.max(1, Number(v))))
                  }
                />
              </>
            )}
          </Flex>
        </Flex>

        <Flex direction="column" gap={2} flexShrink={0} maxW="500px">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.300"
            textAlign="left"
          >
            Expenses
          </Text>
          {expenses.map((exp, i) => (
            <Flex key={i} gap={2} alignItems="flex-end">
              <Field.Root maxW="70px">
                <Field.Label fontSize="xs">Day</Field.Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={exp.day}
                  onChange={(e) =>
                    updateExpense(i, "day", Number(e.target.value))
                  }
                  size="sm"
                />
              </Field.Root>
              <Field.Root flex={1}>
                <Field.Label fontSize="xs">Amount</Field.Label>
                <Input
                  type="number"
                  value={exp.amount}
                  onChange={(e) =>
                    updateExpense(i, "amount", Number(e.target.value))
                  }
                  size="sm"
                />
              </Field.Root>
              <Button
                size="sm"
                variant="solid"
                colorPalette="red"
                flexShrink={0}
                onClick={() => removeExpense(i)}
              >
                &#x2716;
              </Button>
            </Flex>
          ))}
          <Button
            size="sm"
            variant="solid"
            colorPalette="green"
            alignSelf="start"
            onClick={addExpense}
          >
            + Add Expense
          </Button>
        </Flex>

        {result.events.length > 0 && (
          <>
            <Box
              flex={1}
              minH={0}
              border="1px solid"
              borderColor="gray.700"
              borderRadius="md"
              overflow="hidden"
              display="flex"
              flexDirection="column"
            >
              <Box overflowY="auto" flex={1}>
                <TableHeader />
                {result.events.map((ev, i) => (
                  <TableRow key={i} event={ev} />
                ))}
              </Box>
            </Box>

            <Flex
              border="1px solid"
              borderColor="gray.700"
              borderRadius="md"
              p={4}
              gap={8}
              bg="gray.800"
              flexShrink={0}
            >
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Ending Checking
                </Text>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  fontFamily="mono"
                  color={
                    result.summary.endingChecking >= 0 ? "green.300" : "red.300"
                  }
                >
                  {formatCurrency(result.summary.endingChecking)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Ending Savings
                </Text>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  fontFamily="mono"
                  color="yellow.300"
                >
                  {formatCurrency(result.summary.endingSavings)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Lowest Checking
                </Text>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  fontFamily="mono"
                  color={
                    result.summary.lowestChecking >= 0 ? "green.300" : "red.300"
                  }
                >
                  {formatCurrency(result.summary.lowestChecking)}
                </Text>
              </Box>
            </Flex>
          </>
        )}
      </Flex>
    </GenericPage>
  );
}
