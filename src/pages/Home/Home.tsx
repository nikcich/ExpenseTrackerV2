import { API } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import { Button } from "@chakra-ui/react";

export function Home() {
  return <Button onClick={createTauriInvoker(API.NewWindow)}>Click me</Button>;
}
