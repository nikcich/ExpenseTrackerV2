import { createSystem, defaultConfig, defineSemanticTokens } from "@chakra-ui/react";

const customSemanticTokens = defineSemanticTokens.colors({
  bg: {
    DEFAULT: {
      value: { _light: "{colors.white}", _dark: "#141417" },
    },
    subtle: {
      value: { _light: "{colors.gray.50}", _dark: "#1c1c21" },
    },
    muted: {
      value: { _light: "{colors.gray.100}", _dark: "#23232a" },
    },
    emphasized: {
      value: { _light: "{colors.gray.200}", _dark: "#32323c" },
    },
    inverted: {
      value: { _light: "{colors.black}", _dark: "{colors.white}" },
    },
    panel: {
      value: { _light: "{colors.white}", _dark: "#19191e" },
    },
    error: {
      value: { _light: "{colors.red.50}", _dark: "{colors.red.950}" },
    },
    warning: {
      value: { _light: "{colors.orange.50}", _dark: "{colors.orange.950}" },
    },
    success: {
      value: { _light: "{colors.green.50}", _dark: "{colors.green.950}" },
    },
    info: {
      value: { _light: "{colors.blue.50}", _dark: "{colors.blue.950}" },
    },
  },
  fg: {
    DEFAULT: {
      value: { _light: "{colors.black}", _dark: "#e8e8ed" },
    },
    muted: {
      value: { _light: "{colors.gray.600}", _dark: "#a0a0ab" },
    },
    subtle: {
      value: { _light: "{colors.gray.400}", _dark: "#6b6b7b" },
    },
    inverted: {
      value: { _light: "{colors.gray.50}", _dark: "{colors.black}" },
    },
    error: {
      value: { _light: "{colors.red.500}", _dark: "{colors.red.400}" },
    },
    warning: {
      value: { _light: "{colors.orange.600}", _dark: "{colors.orange.300}" },
    },
    success: {
      value: { _light: "{colors.green.600}", _dark: "{colors.green.300}" },
    },
    info: {
      value: { _light: "{colors.blue.600}", _dark: "{colors.blue.300}" },
    },
  },
  border: {
    DEFAULT: {
      value: { _light: "{colors.gray.200}", _dark: "#32323c" },
    },
    muted: {
      value: { _light: "{colors.gray.100}", _dark: "#23232a" },
    },
    subtle: {
      value: { _light: "{colors.gray.50}", _dark: "#1c1c21" },
    },
    emphasized: {
      value: { _light: "{colors.gray.300}", _dark: "#3f3f4b" },
    },
    inverted: {
      value: { _light: "{colors.gray.800}", _dark: "{colors.gray.200}" },
    },
    error: {
      value: { _light: "{colors.red.500}", _dark: "{colors.red.400}" },
    },
    warning: {
      value: { _light: "{colors.orange.500}", _dark: "{colors.orange.400}" },
    },
    success: {
      value: { _light: "{colors.green.500}", _dark: "{colors.green.400}" },
    },
    info: {
      value: { _light: "{colors.blue.500}", _dark: "{colors.blue.400}" },
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
