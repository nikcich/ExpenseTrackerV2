import { useState } from "react";
import { Button, Input, Text, VStack, HStack, Box, Spinner } from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { API, Response } from "@/types/types";

export const AiTestPage = () => {
  const [input, setInput] = useState("Starbucks coffee");
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<string | null>(null);

  const handleDownload = async () => {
    setModelStatus("Downloading...");
    try {
      const result = await invoke<Response<string>>(API.ForceRedownloadModel);
      setModelStatus(`[${result.status}] ${result.header}: ${result.message}`);
    } catch (e) {
      setModelStatus(`Error: ${e}`);
    }
  };

  const handleTest = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput(null);
    try {
      const result = await invoke<Response<string>>(API.SuggestTag, {
        description: input,
        examples: [],
      });
      setOutput(`[${result.status}] ${result.header}\n\n${result.message}`);
    } catch (e) {
      setOutput(`Invoke error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={8} maxW="600px">
      <Text fontSize="xl" mb={4}>AI Model Test</Text>

      <VStack gap={4} align="stretch">
        <Box>
          <Text fontSize="sm" mb={1}>Step 1: Download model (one-time)</Text>
          <HStack>
            <Button onClick={handleDownload} colorPalette="blue" size="sm">
              Download Model
            </Button>
            {modelStatus && <Text fontSize="xs" color="fg.subtle">{modelStatus}</Text>}
          </HStack>
        </Box>

        <Box>
          <Text fontSize="sm" mb={1}>Step 2: Test classification</Text>
          <HStack>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a transaction description"
              onKeyDown={(e) => e.key === "Enter" && handleTest()}
            />
            <Button onClick={handleTest} disabled={loading} colorPalette="purple">
              {loading ? <Spinner size="sm" /> : "Classify"}
            </Button>
          </HStack>
        </Box>

        {output && (
          <Box
            p={4}
            borderRadius="md"
            borderWidth="1px"
            borderColor="border.DEFAULT"
            bg="bg.subtle"
            fontFamily="monospace"
            fontSize="sm"
            whiteSpace="pre-wrap"
          >
            {output}
          </Box>
        )}
      </VStack>
    </Box>
  );
};
