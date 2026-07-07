import { createStore } from "./generic-store";

export type SuggestionEntry = {
  expenseId: string;
  description: string;
  suggestedTag: string;
  confirmed: boolean;
  rejected: boolean;
};

type SuggestionStore = {
  suggestions: SuggestionEntry[];
  loading: boolean;
  error: string | null;
};

const store = createStore<SuggestionStore>({
  suggestions: [],
  loading: false,
  error: null,
});

export const { useStore: useSuggestionStore, setState: setSuggestionStore } = store;

export const useSuggestions = () => useSuggestionStore("suggestions");
export const useSuggestionsLoading = () => useSuggestionStore("loading");

export const setSuggestions = (suggestions: SuggestionEntry[]) =>
  setSuggestionStore({ suggestions });

export const setSuggestionsLoading = (loading: boolean) =>
  setSuggestionStore({ loading });

export const setSuggestionsError = (error: string | null) =>
  setSuggestionStore({ error });

export const confirmSuggestion = (expenseId: string) =>
  setSuggestionStore((state) => ({
    suggestions: state.suggestions.map((s) =>
      s.expenseId === expenseId ? { ...s, confirmed: true, rejected: false } : s
    ),
  }));

export const rejectSuggestion = (expenseId: string) =>
  setSuggestionStore((state) => ({
    suggestions: state.suggestions.map((s) =>
      s.expenseId === expenseId ? { ...s, rejected: true, confirmed: false } : s
    ),
  }));

export const clearSuggestions = () =>
  setSuggestionStore({ suggestions: [], error: null });
