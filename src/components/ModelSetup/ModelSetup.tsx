import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { API, Response } from "@/types/types";
import { Box, Text, VStack, Progress } from "@chakra-ui/react";

export const ModelSetup = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Starting...");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const myUnlisten = await listen<{ percent: number; stage: string }>("download_progress", (event) => {
        if (!alive) return;
        const { percent, stage } = event.payload;
        const rounded = Math.round(percent);
        setProgress(rounded);
        if (stage === "downloading") {
          setStatus(`Downloading model... ${rounded}%`);
        } else if (stage === "verifying") {
          setStatus("Verifying download...");
        } else if (stage.startsWith("Testing")) {
          setStatus(stage);
        } else if (stage === "ready") {
          setStatus("Ready!");
        } else if (stage === "failed") {
          setStatus("Download failed");
        }
      });

      if (!alive) {
        myUnlisten();
        return;
      }
      unlistenRef.current = myUnlisten;

      try {
        const result = await invoke<Response<string>>(API.EnsureModelReady);
        if (!alive) return;

        if (result.status >= 400) {
          setError(result.message ?? "Unknown error");
          return;
        }

        setReady(true);
      } catch (e) {
        if (alive) setError(String(e));
      }
    };

    run();

    return () => {
      alive = false;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setProgress(0);
    setStatus("Starting...");
    setRetrying((r) => !r);
  };

  useEffect(() => {
    if (!retrying) return;
    let alive = true;

    const rerun = async () => {
      try {
        const result = await invoke<Response<string>>(API.EnsureModelReady);
        if (!alive) return;
        if (result.status >= 400) {
          setError(result.message ?? "Unknown error");
          return;
        }
        setReady(true);
      } catch (e) {
        if (alive) setError(String(e));
      }
    };

    rerun();
    return () => { alive = false; };
  }, [retrying]);

  if (ready) return <>{children}</>;

  return (
    <Box
      w="100vw"
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="var(--chakra-colors-bg-canvas)"
    >
      <VStack gap={6} maxW="480px" w="90%" textAlign="center">
        <Text fontSize="2xl" fontWeight="600">Setting up AI tagger</Text>

        {error ? (
          <VStack gap={3}>
            <Text color="red.400" fontSize="sm">{error}</Text>
            <Box
              as="button"
              px={6}
              py={2}
              borderRadius="md"
              bg="blue.500"
              color="white"
              fontSize="sm"
              fontWeight="600"
              onClick={handleRetry}
            >
              Retry
            </Box>
          </VStack>
        ) : (
          <VStack gap={3} w="100%">
            <Progress.Root value={progress} maxW="100%" w="100%" size="lg">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <Text fontSize="sm" color="fg.subtle">{status}</Text>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};
