import styles from "./App.module.scss";
import "./BaseStyles.scss";
import { AppRouter } from "./AppRouter";

function App() {
  return (
    <div className={styles.container}>
      <AppRouter />
    </div>
  );
}

export default App;
