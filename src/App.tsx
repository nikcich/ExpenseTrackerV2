import { useState } from 'react';
import './App.css';
import { useValue } from './store/store';
import { API } from './types/types';
import { createTauriInvoker } from './utils/utils';

function App() {
  const { value, setValue } = useValue();
  const [inputValue, setInputValue] = useState<number>(0);

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <input
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(parseInt(e.target.value))}
      />
      <button onClick={() => setValue(inputValue)}>Set Value</button>
      <p>Value: {value}</p>
      <button onClick={createTauriInvoker(API.NewWindow)}>New Window</button>
    </main>
  );
}

export default App;
