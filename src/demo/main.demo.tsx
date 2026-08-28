import "vite/modulepreload-polyfill";
import { setMockMode } from "@/utils/utils";

setMockMode(true);

const { default: App } = await import("../App");
const { ChakraProvider } = await import("@chakra-ui/react");
const { ColorModeProvider } = await import("@/components/ui/color-mode");
const { createRoot } = await import("react-dom/client");
const { default: React } = await import("react");
const { default: system } = await import("@/theme");

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ColorModeProvider forcedTheme="dark">
        <App />
      </ColorModeProvider>
    </ChakraProvider>
  </React.StrictMode>
);
