import { API, Response } from "@/types/types";
import { Button, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import styles from "./FileOpener.module.scss";
import { Alert } from "@chakra-ui/react";
import { GenericPage } from "@/components/GenericPage/GenericPage";

const useFileOpener = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    Response<string[]> | Response<string> | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | undefined>(
    undefined
  );

  const openFile = useCallback(async () => {
    reset();
    setLoading(true);

    const file = await open({
      multiple: false,
      directory: false,
      recursive: false,
      canCreateDirectories: false,
    });

    if (file) {
      const res: Response<string[]> = await invoke(API.OpenCSV, {
        file,
      });
      setSelectedFile(file);
      setResult(res);
    }

    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const finishParsingCsv = useCallback(async () => {
    const res = await invoke<Response<string>>(API.ParseCSV, {
      path: selectedFile!,
      csvDefinitionKey: selectedFormat!,
    });

    reset();
    setResult(res);
  }, [selectedFormat, selectedFile]);

  const reset = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setSelectedFormat(undefined);
  }, []);

  return {
    loading,
    result,
    openFile,
    selectedFile,
    setSelectedFile,
    selectedFormat,
    setSelectedFormat,
    finishParsingCsv,
  };
};

export function FileOpener() {
  const {
    loading,
    result,
    openFile,
    selectedFile,
    selectedFormat,
    setSelectedFormat,
    finishParsingCsv,
  } = useFileOpener();

  return (
    <GenericPage title="File Opener" hasRange={false} needsData={false}>
      <div className={styles.container}>
        {result && (
          <Alert.Root status={result.status >= 400 ? "error" : "success"}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{`${result.header}, ${result.message}`}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {loading && (
          <div className={styles.spinnerContainer}>
            <Spinner />
          </div>
        )}

        <Button onClick={openFile} colorPalette={"blue"}>
          Select File
        </Button>

        {selectedFile && (
          <FormatSelector
            options={
              Array.isArray(result?.message)
                ? result.message
                : [result?.message || ""]
            }
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            finishParsingCsv={finishParsingCsv}
          />
        )}
      </div>
    </GenericPage>
  );
}

const FormatSelector = ({
  options,
  selectedFormat,
  setSelectedFormat,
  finishParsingCsv,
}: {
  options: string[];
  selectedFormat: string | undefined;
  setSelectedFormat: React.Dispatch<React.SetStateAction<string | undefined>>;
  finishParsingCsv: () => Promise<void>;
}) => {
  return (
    <>
      <Text>Select matching CSV format:</Text>
      <NativeSelect.Root>
        <NativeSelect.Field
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.currentTarget.value)}
        >
          <option value={undefined}></option>
          {options.map((key, index) => (
            <option key={index} value={key}>
              {key}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <Button
        onClick={finishParsingCsv}
        colorPalette={"green"}
        disabled={!selectedFormat}
      >
        Parse File with Selected Format
      </Button>
    </>
  );
};
