import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
  IncomeRule,
  ExpenseRule,
  computeCashFlowForecast,
} from "@/utils/cash-flow-forecast";
import { useForecastConfig } from "@/store/store";
import { format } from "date-fns";
import { FaChevronRight } from "react-icons/fa";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const cleanNum = (v: string) => String(Number(v));

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
      type={type === "number" ? "text" : type}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={type === "number" ? (e) => onChange(cleanNum(e.target.value)) : undefined}
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

const eventColor = (event: CashFlowEvent): string => {
  if (event.type === "income") return "green.300";
  if (event.type === "expense") return "red.300";
  if (event.type === "transfer") return "yellow.300";
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
    color={eventColor(event)}
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
  startBalance: 0,
  reserve: 0,
  startDate: "",
  endDate: "",
};

export function Forecast() {
  const [startBalance, setStartBalance] = useState(DEFAULT_CONFIG.startBalance);
  const [reserve, setReserve] = useState(DEFAULT_CONFIG.reserve);
  const [startDate, setStartDate] = useState(DEFAULT_CONFIG.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_CONFIG.endDate);
  const [sections, setSections] = useState({ general: true, income: true, expenses: true });
  const toggleSection = (key: keyof typeof sections) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const [incomeStreams, setIncomeStreams] = useState<IncomeRule[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRule[]>([]);

  const { config: savedConfig, loaded, saveConfig } = useForecastConfig();
  const initialized = useRef(false);

  useEffect(() => {
    if (savedConfig && !initialized.current) {
      setStartBalance(savedConfig.startBalance);
      setReserve(savedConfig.reserve);
      setStartDate(savedConfig.startDate);
      setEndDate(savedConfig.endDate);
      if (savedConfig.incomeStreams) {
        setIncomeStreams(
          savedConfig.incomeStreams.map((s) => ({
            ...s,
            payPeriod: s.payPeriod as PayPeriod,
          }))
        );
      }
      if (savedConfig.expenses) {
        setExpenses(
          savedConfig.expenses.map((e) => ({
            ...e,
            period: e.period as PayPeriod,
          }))
        );
      }
      initialized.current = true;
    } else if (loaded && !initialized.current) {
      initialized.current = true;
    }
  }, [savedConfig, loaded]);

  useEffect(() => {
    if (!initialized.current) return;
    saveConfig({ startBalance, reserve, startDate, endDate, incomeStreams, expenses });
  }, [startBalance, reserve, startDate, endDate, incomeStreams, expenses]);

  const updateIncome = useCallback((index: number, field: string, value: string | number) => {
    setIncomeStreams((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  }, []);

  const removeIncome = useCallback((index: number) => {
    setIncomeStreams((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addIncome = useCallback(() => {
    const defaultDate = format(new Date(), "yyyy-MM-dd");
    setIncomeStreams((prev) => [
      ...prev,
      { amount: 0, payPeriod: "biweekly", firstPaycheckDate: defaultDate, semimonthlyPayday1: 1, semimonthlyPayday2: 15 },
    ]);
  }, []);

  const updateExpense = useCallback(
    (index: number, field: keyof ExpenseRule, value: string | number) => {
      setExpenses((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          [field]: field === "day" ? Math.min(31, Math.max(1, Number(value))) : value,
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
    () => computeCashFlowForecast({ startBalance, reserve, startDate, endDate, incomeStreams, expenses }),
    [startBalance, reserve, startDate, endDate, incomeStreams, expenses],
  );

  return (
    <GenericPage title="Forecast" hasRange={false} needsData={false}>
      <Flex direction="column" p={4} gap={4}>
        <Box>
          <Flex align="center" gap={2} cursor="pointer" onClick={() => toggleSection("general")}>
            <Box transition="transform 0.2s" transform={sections.general ? "rotate(90deg)" : undefined}>
              <FaChevronRight size={12} />
            </Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.300">General</Text>
          </Flex>
          {sections.general && (
            <Flex direction="column" gap={2} w="100%" mt={2}>
              <Flex wrap="wrap" gap={4} alignItems="flex-end">
                <CFGroup label="Starting Balance" value={startBalance} onChange={(v) => setStartBalance(Number(v))} />
                <CFGroup label="Reserve Amount" value={reserve} onChange={(v) => setReserve(Number(v))} />
                <CFGroup label="Start Date" value={startDate} onChange={setStartDate} type="date" />
                <CFGroup label="End Date" value={endDate} onChange={setEndDate} type="date" />
              </Flex>
            </Flex>
          )}
        </Box>

        <Box>
          <Flex align="center" gap={2} cursor="pointer" onClick={() => toggleSection("income")}>
            <Box transition="transform 0.2s" transform={sections.income ? "rotate(90deg)" : undefined}>
              <FaChevronRight size={12} />
            </Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.300">Income</Text>
          </Flex>
          {sections.income && (
            <Flex direction="column" gap={2} mt={2}>
              {incomeStreams.map((stream, i) => (
                <Flex key={i} gap={2} alignItems="flex-end" wrap="wrap">
                  <Field.Root maxW="140px">
                    <Field.Label fontSize="xs">Name</Field.Label>
                    <Input type="text" value={stream.name || ""} onChange={(e) => updateIncome(i, "name", e.target.value)} size="sm" placeholder="e.g. Salary" />
                  </Field.Root>
                  <Field.Root maxW="120px">
                    <Field.Label fontSize="xs">Amount</Field.Label>
                    <Input type="text" inputMode="decimal" value={stream.amount} onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return;
                      const num = Number(raw);
                      if (!isNaN(num)) updateIncome(i, "amount", num);
                    }} size="sm" />
                  </Field.Root>
                  <Field.Root maxW="160px">
                    <Field.Label fontSize="xs">Period</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={stream.payPeriod} onChange={(e) => updateIncome(i, "payPeriod", e.currentTarget.value)}>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                        <option value="semimonthly">Semi-monthly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semiannual">Semi-annual</option>
                        <option value="annual">Annual</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  {stream.payPeriod !== "semimonthly" ? (
                    <Field.Root maxW="150px">
                      <Field.Label fontSize="xs">First Paycheck</Field.Label>
                      <Input type="date" value={stream.firstPaycheckDate} onChange={(e) => updateIncome(i, "firstPaycheckDate", e.target.value)} size="sm" />
                    </Field.Root>
                  ) : (
                    <>
                      <Field.Root maxW="70px">
                        <Field.Label fontSize="xs">Day 1</Field.Label>
                        <Input type="text" inputMode="numeric" value={stream.semimonthlyPayday1} onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") return;
                          const num = Number(raw);
                          if (!isNaN(num)) updateIncome(i, "semimonthlyPayday1", Math.min(31, Math.max(1, num)));
                        }} size="sm" />
                      </Field.Root>
                      <Field.Root maxW="70px">
                        <Field.Label fontSize="xs">Day 2</Field.Label>
                        <Input type="text" inputMode="numeric" value={stream.semimonthlyPayday2} onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") return;
                          const num = Number(raw);
                          if (!isNaN(num)) updateIncome(i, "semimonthlyPayday2", Math.min(31, Math.max(1, num)));
                        }} size="sm" />
                      </Field.Root>
                    </>
                  )}
                  <Button size="sm" variant="solid" colorPalette="red" flexShrink={0} onClick={() => removeIncome(i)}>
                    &#x2716;
                  </Button>
                </Flex>
              ))}
              <Button size="sm" variant="solid" colorPalette="green" alignSelf="start" onClick={addIncome}>
                + Add Income
              </Button>
            </Flex>
          )}
        </Box>

        <Box>
          <Flex align="center" gap={2} cursor="pointer" onClick={() => toggleSection("expenses")}>
            <Box transition="transform 0.2s" transform={sections.expenses ? "rotate(90deg)" : undefined}>
              <FaChevronRight size={12} />
            </Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.300">Expenses</Text>
          </Flex>
          {sections.expenses && (
            <Flex direction="column" gap={2} mt={2}>
              {expenses.map((exp, i) => (
                <Flex key={i} gap={2} alignItems="flex-end" wrap="wrap">
                  <Field.Root maxW="140px">
                    <Field.Label fontSize="xs">Name</Field.Label>
                    <Input type="text" value={exp.name || ""} onChange={(e) => updateExpense(i, "name", e.target.value)} size="sm" placeholder="e.g. Rent" />
                  </Field.Root>
                  {(!exp.period || exp.period === "monthly") ? (
                    <Field.Root maxW="70px">
                      <Field.Label fontSize="xs">Day</Field.Label>
                      <Input type="text" inputMode="numeric" value={exp.day} onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") return;
                        const num = Number(raw);
                        if (!isNaN(num)) updateExpense(i, "day", num);
                      }} size="sm" />
                    </Field.Root>
                  ) : (
                    <Field.Root maxW="150px">
                      <Field.Label fontSize="xs">First Date</Field.Label>
                      <Input type="date" value={exp.firstDate || ""} onChange={(e) => updateExpense(i, "firstDate", e.target.value)} size="sm" />
                    </Field.Root>
                  )}
                  <Field.Root maxW="100px">
                    <Field.Label fontSize="xs">Amount</Field.Label>
                    <Input type="text" inputMode="decimal" value={exp.amount} onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return;
                      const num = Number(raw);
                      if (!isNaN(num)) updateExpense(i, "amount", num);
                    }} size="sm" />
                  </Field.Root>
                  <Field.Root maxW="140px">
                    <Field.Label fontSize="xs">Period</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field value={exp.period || "monthly"} onChange={(e) => {
                        const newPeriod = e.currentTarget.value;
                        updateExpense(i, "period", newPeriod);
                        if (newPeriod !== "monthly" && !exp.firstDate) {
                          updateExpense(i, "firstDate", format(new Date(), "yyyy-MM-dd"));
                        }
                      }}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semiannual">Semi-annual</option>
                        <option value="annual">Annual</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  <Button size="sm" variant="solid" colorPalette="red" flexShrink={0} onClick={() => removeExpense(i)}>
                    &#x2716;
                  </Button>
                </Flex>
              ))}
              <Button size="sm" variant="solid" colorPalette="green" alignSelf="start" onClick={addExpense}>
                + Add Expense
              </Button>
            </Flex>
          )}
        </Box>

        {result.events.length > 0 && (
          <>
            <Box h="500px" border="1px solid" borderColor="gray.700" borderRadius="md" overflow="hidden" display="flex" flexDirection="column">
              <Box overflowY="auto" flex={1}>
                <TableHeader />
                {result.events.map((ev, i) => <TableRow key={i} event={ev} />)}
              </Box>
            </Box>

            <Flex border="1px solid" borderColor="gray.700" borderRadius="md" p={4} gap={8} bg="gray.800">
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>Ending Checking</Text>
                <Text fontSize="xl" fontWeight="bold" fontFamily="mono" color={result.summary.endingChecking >= 0 ? "green.300" : "red.300"}>
                  {formatCurrency(result.summary.endingChecking)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>Ending Savings</Text>
                <Text fontSize="xl" fontWeight="bold" fontFamily="mono" color="yellow.300">
                  {formatCurrency(result.summary.endingSavings)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>Lowest Checking</Text>
                <Text fontSize="xl" fontWeight="bold" fontFamily="mono" color={result.summary.lowestChecking >= 0 ? "green.300" : "red.300"}>
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
