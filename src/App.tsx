import { useState } from "react";
import "./App.css";
import { useValue } from "./store/store";

function App() {

  const {value, setValue} = useValue();

  const [inputValue, setInputValue] = useState<number>(0);

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <input type="number" value={inputValue} onChange={(e) => setInputValue(parseInt(e.target.value))}/>
      <button onClick={() => setValue(inputValue)}>Set Value</button>
      <p>Value: {value}</p>
    </main>
  );
}

export default App;
