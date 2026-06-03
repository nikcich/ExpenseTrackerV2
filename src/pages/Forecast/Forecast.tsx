import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useMemo, useState } from "react";
import {
  format,
  parseISO,
  addDays,
  getDaysInMonth,
  isAfter,
} from "date-fns";
import { Box, Text, Input, Flex, Field } from "@chakra-ui/react";

interface CashFlowEvent {
  date: string;
  event: string;
  change: number | null;
  checking: number;
  savings: number;
}

interface CashFlowSummary {
  endingChecking: number;
  endingSavings: number;
  lowestChecking: number;
}

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
    <Box w="130px" textAlign="right">Change</Box>
    <Box w="130px" textAlign="right">Checking</Box>
    <Box w="130px" textAlign="right">Savings</Box>
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
    <Box w="130px" textAlign="right">{formatCurrency(event.checking)}</Box>
    <Box w="130px" textAlign="right">{formatCurrency(event.savings)}</Box>
  </Flex>
);

const DEFAULT_CONFIG = {
  startBalance: 7800,
  reserve: 8000,
  startDate: "2026-06-01",
  endDate: "2026-12-31",
  paycheckAmount: 4800,
  firstPaycheckDate: "2026-06-05",
  expense12th: 1500,
  expense20th: 3500,
};

export function Forecast() {
  const [startBalance, setStartBalance] = useState(DEFAULT_CONFIG.startBalance);
  const [reserve, setReserve] = useState(DEFAULT_CONFIG.reserve);
  const [startDate, setStartDate] = useState(DEFAULT_CONFIG.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_CONFIG.endDate);
  const [paycheckAmount, setPaycheckAmount] = useState(DEFAULT_CONFIG.paycheckAmount);
  const [firstPaycheckDate, setFirstPaycheckDate] = useState(DEFAULT_CONFIG.firstPaycheckDate);
  const [expense12th, setExpense12th] = useState(DEFAULT_CONFIG.expense12th);
  const [expense20th, setExpense20th] = useState(DEFAULT_CONFIG.expense20th);

  const result = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const firstPaycheck = parseISO(firstPaycheckDate);

    let balance = startBalance;
    let savings = 0;
    let lowestBalance = balance;

    const paydays = new Set<string>();
    let d = firstPaycheck;
    while (!isAfter(d, end)) {
      paydays.add(format(d, "yyyy-MM-dd"));
      d = addDays(d, 14);
    }

    const events: CashFlowEvent[] = [
      {
        date: format(start, "yyyy-MM-dd"),
        event: "Starting Balance",
        change: null,
        checking: balance,
        savings,
      },
    ];

    let current = start;
    while (!isAfter(current, end)) {
      const dateStr = format(current, "yyyy-MM-dd");
      let hasEvent = false;

      if (paydays.has(dateStr)) {
        balance += paycheckAmount;
        events.push({
          date: dateStr,
          event: "Paycheck",
          change: paycheckAmount,
          checking: balance,
          savings,
        });
        hasEvent = true;
      }

      if (current.getDate() === 12) {
        balance -= expense12th;
        events.push({
          date: dateStr,
          event: "Expense (12th)",
          change: -expense12th,
          checking: balance,
          savings,
        });
        hasEvent = true;
      }

      if (current.getDate() === 20) {
        balance -= expense20th;
        events.push({
          date: dateStr,
          event: "Expense (20th)",
          change: -expense20th,
          checking: balance,
          savings,
        });
        hasEvent = true;
      }

      const lastDay = getDaysInMonth(current);
      if (current.getDate() === lastDay) {
        const transfer = Math.max(0, balance - reserve);
        if (transfer > 0) {
          balance -= transfer;
          savings += transfer;
          events.push({
            date: dateStr,
            event: "Savings Transfer",
            change: -transfer,
            checking: balance,
            savings,
          });
          hasEvent = true;
        }
      }

      if (hasEvent) {
        lowestBalance = Math.min(lowestBalance, balance);
      }

      current = addDays(current, 1);
    }

    const summary: CashFlowSummary = {
      endingChecking: balance,
      endingSavings: savings,
      lowestChecking: lowestBalance,
    };

    return { events, summary };
  }, [
    startBalance,
    reserve,
    startDate,
    endDate,
    paycheckAmount,
    firstPaycheckDate,
    expense12th,
    expense20th,
  ]);

  return (
    <GenericPage title="Forecast" hasRange={false} needsData={false}>
      <Box p={4}>
        <Flex wrap="wrap" gap={4} mb={6}>
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
          <CFGroup
            label="Paycheck Amount"
            value={paycheckAmount}
            onChange={(v) => setPaycheckAmount(Number(v))}
          />
          <CFGroup
            label="First Paycheck"
            value={firstPaycheckDate}
            onChange={setFirstPaycheckDate}
            type="date"
          />
          <CFGroup
            label="Expense (12th)"
            value={expense12th}
            onChange={(v) => setExpense12th(Number(v))}
          />
          <CFGroup
            label="Expense (20th)"
            value={expense20th}
            onChange={(v) => setExpense20th(Number(v))}
          />
        </Flex>

        {result.events.length > 0 && (
          <>
            <Box
              border="1px solid"
              borderColor="gray.700"
              borderRadius="md"
              overflow="hidden"
              mb={4}
              maxH="60vh"
              overflowY="auto"
            >
              <TableHeader />
              {result.events.map((ev, i) => (
                <TableRow key={i} event={ev} />
              ))}
            </Box>

            <Flex
              border="1px solid"
              borderColor="gray.700"
              borderRadius="md"
              p={4}
              gap={8}
              bg="gray.800"
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
                    result.summary.endingChecking >= 0
                      ? "green.300"
                      : "red.300"
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
                    result.summary.lowestChecking >= 0
                      ? "green.300"
                      : "red.300"
                  }
                >
                  {formatCurrency(result.summary.lowestChecking)}
                </Text>
              </Box>
            </Flex>
          </>
        )}
      </Box>
    </GenericPage>
  );
}
