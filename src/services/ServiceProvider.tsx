import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BehaviorSubject } from "rxjs";
import type { ExpenseTrackerService } from "./ExpenseTrackerService";
import { TauriService } from "./TauriService";
import { MockService } from "./MockService";

export const mockMode$ = new BehaviorSubject<boolean>(false);
export const setMockMode = (enabled: boolean) => mockMode$.next(enabled);

export const activeService$ = new BehaviorSubject<ExpenseTrackerService | null>(
  null,
);

export const getActiveService = () => activeService$.getValue();

const ExpenseTrackerServiceContext = createContext<ExpenseTrackerService | null>(
  null,
);

export const useExpenseTrackerService = (): ExpenseTrackerService => {
  const service = useContext(ExpenseTrackerServiceContext);
  if (!service) {
    throw new Error(
      "useExpenseTrackerService must be used within an ExpenseTrackerServiceProvider",
    );
  }
  return service;
};

export const ExpenseTrackerServiceProvider = ({
  children,
  service,
  mockService,
}: {
  children: ReactNode;
  service?: ExpenseTrackerService;
  mockService?: ExpenseTrackerService;
}) => {
  const base = useMemo<ExpenseTrackerService>(
    () => service ?? new TauriService(),
    [service],
  );

  const [active, setActive] = useState<ExpenseTrackerService>(() =>
    mockMode$.getValue() ? (mockService ?? new MockService()) : base,
  );

  useEffect(() => {
    const subscription = mockMode$.subscribe((enabled) => {
      setActive(enabled ? (mockService ?? new MockService()) : base);
    });
    return () => subscription.unsubscribe();
  }, [base, mockService]);

  useEffect(() => {
    activeService$.next(active);
    return () => activeService$.next(null);
  }, [active]);

  return (
    <ExpenseTrackerServiceContext.Provider value={active}>
      {children}
    </ExpenseTrackerServiceContext.Provider>
  );
};