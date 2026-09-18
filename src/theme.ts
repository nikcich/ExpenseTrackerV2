import { createSystem, defaultConfig, defineSemanticTokens } from "@chakra-ui/react";

const customSemanticTokens = defineSemanticTokens.colors({
  bg: {
    DEFAULT: {
      value: { _light: "{colors.white}", _dark: "#121212" },
    },
    subtle: {
      value: { _light: "{colors.gray.50}", _dark: "#1a1a1a" },
    },
    muted: {
      value: { _light: "{colors.gray.100}", _dark: "#232323" },
    },
    emphasized: {
      value: { _light: "{colors.gray.200}", _dark: "#2c2c2c" },
    },
    inverted: {
      value: { _light: "{colors.black}", _dark: "{colors.white}" },
    },
    panel: {
      value: { _light: "{colors.white}", _dark: "#1a1a1a" },
    },
    error: {
      value: { _light: "{colors.red.50}", _dark: "#3a1d1d" },
    },
    warning: {
      value: { _light: "{colors.orange.50}", _dark: "#3a2f0d" },
    },
    success: {
      value: { _light: "{colors.green.50}", _dark: "#16302180" },
    },
    info: {
      value: { _light: "{colors.blue.50}", _dark: "#1d2a3a" },
    },
  },
  fg: {
    DEFAULT: {
      value: { _light: "{colors.black}", _dark: "#f2f2f2" },
    },
    muted: {
      value: { _light: "{colors.gray.600}", _dark: "#b3b3b3" },
    },
    subtle: {
      value: { _light: "{colors.gray.400}", _dark: "#7a7a7a" },
    },
    disabled: {
      value: { _light: "{colors.gray.400}", _dark: "#4d4d4d" },
    },
    inverted: {
      value: { _light: "{colors.gray.50}", _dark: "{colors.black}" },
    },
    error: {
      value: { _light: "{colors.red.500}", _dark: "#f87171" },
    },
    warning: {
      value: { _light: "{colors.orange.600}", _dark: "#facc15" },
    },
    success: {
      value: { _light: "{colors.green.600}", _dark: "#4ade80" },
    },
    info: {
      value: { _light: "{colors.blue.600}", _dark: "#60a5fa" },
    },
  },
  border: {
    DEFAULT: {
      value: { _light: "{colors.gray.200}", _dark: "#3a3a3a" },
    },
    muted: {
      value: { _light: "{colors.gray.100}", _dark: "#2e2e2e" },
    },
    subtle: {
      value: { _light: "{colors.gray.50}", _dark: "#2e2e2e" },
    },
    emphasized: {
      value: { _light: "{colors.gray.300}", _dark: "#4d4d4d" },
    },
    inverted: {
      value: { _light: "{colors.gray.800}", _dark: "{colors.gray.200}" },
    },
    error: {
      value: { _light: "{colors.red.500}", _dark: "#f87171" },
    },
    warning: {
      value: { _light: "{colors.orange.500}", _dark: "#facc15" },
    },
    success: {
      value: { _light: "{colors.green.500}", _dark: "#4ade80" },
    },
    info: {
      value: { _light: "{colors.blue.500}", _dark: "#60a5fa" },
    },
  },
  accent: {
    primary: {
      value: { _light: "{colors.blue.600}", _dark: "#7c9dff" },
    },
    "primary-hover": {
      value: { _light: "{colors.blue.500}", _dark: "#93aeff" },
    },
    "primary-muted": {
      value: { _light: "{colors.blue.100}", _dark: "#2a3352" },
    },
  },
});

const system = createSystem(defaultConfig, {
  theme: {
    semanticTokens: {
      colors: customSemanticTokens,
    },
  },
});

export default system;
