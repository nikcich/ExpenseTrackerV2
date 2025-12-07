import { API, Response } from "@/types/types";
import { Button, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import styles from "./FileOpener.module.scss";
import { Alert } from "@chakra-ui/react";

export function FileOpener() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Response<string[]> | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const openFile = useCallback(async () => {
    setResult(null);
    setSelectedFile(null);
    setLoading(true);
    const file = await open({
      multiple: false,
      directory: false,
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

  return (
    <div className={styles.container}>
      {result && (
        <Alert.Root status={result.status >= 400 ? "error" : "success"}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{result.header}</Alert.Title>
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

      {result && result.message && (
        <FormatSelector filePath={selectedFile!} options={result.message} />
      )}
    </div>
  );
}

const FormatSelector = ({
  options,
  filePath,
}: {
  filePath: string;
  options: string[];
}) => {
  const [selection, setSelection] = useState<string | undefined>(undefined);

  const finishParsingCsv = useCallback(async () => {
    console.log("Selected format:", selection);

    const res = await invoke(API.ParseCSV, {
      path: filePath,
      csvDefinitionKey: selection!,
    });

    console.log(res);
  }, [selection, filePath]);

  return (
    <>
      <Text>Select matching CSV format:</Text>
      <NativeSelect.Root>
        <NativeSelect.Field
          value={selection}
          onChange={(e) => setSelection(e.currentTarget.value)}
        >
          <option value={undefined}></option>
          {options.map((key, index) => {
            return (
              <option key={index} value={key}>
                {key}
              </option>
            );
          })}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>

      <Button
        onClick={finishParsingCsv}
        colorPalette={"green"}
        disabled={!selection}
      >
        Parse File with Selected Format
      </Button>
    </>
  );
};
