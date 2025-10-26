import { useState } from "react";
import { useValue } from "./store/store";
import { API } from "./types/types";
import { createTauriInvoker } from "./utils/utils";
import styles from "./App.module.scss";
import "./BaseStyles.scss";
import { AppRouter } from "./AppRouter";

function App() {
  return (
    <div className={styles.container}>
      {/* <h1>Welcome to Tauri + React</h1>
      <input
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(parseInt(e.target.value))}
      />
      <button onClick={() => setValue(inputValue)}>Set Value</button>
      <p>Value: {value}</p>
      <button onClick={createTauriInvoker(API.NewWindow)}>New Window</button> */}

      <AppRouter />
    </div>
  );
}

export default App;
