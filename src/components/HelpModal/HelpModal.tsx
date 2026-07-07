import { Text } from "@chakra-ui/react";
import { GenericModal } from "../GenericModal/GenericModal";
import { Overlay } from "@/store/OverlayStore";
import styles from "./HelpModal.module.scss";

const K = ({ children }: { children: React.ReactNode }) => (
  <span className={styles.key}>{children}</span>
);

export const HelpModal = () => {
  return (
    <GenericModal overlay={Overlay.HelpModal}>
      <Text fontSize="lg" mb={2}>
        Keyboard Shortcuts
      </Text>

      <div className={styles.sectionTitle}>Navigation</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><K>↑</K> <K>↓</K></td>
            <td>Previous / next page</td>
          </tr>
          <tr>
            <td><K>1</K>–<K>9</K> <K>0</K></td>
            <td>Jump to page by sidebar order</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.sectionTitle}>Actions</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><K>N</K></td>
            <td>New expense</td>
          </tr>
          <tr>
            <td><K>S</K></td>
            <td>Open Settings</td>
          </tr>
          <tr>
            <td><K>?</K></td>
            <td>Show this help</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.sectionTitle}>Modals</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><K>Esc</K></td>
            <td>Close modal</td>
          </tr>
          <tr>
            <td><K>Enter</K></td>
            <td>Submit / confirm</td>
          </tr>
          <tr>
            <td><K>Tab</K> / <K>Shift</K>+<K>Tab</K></td>
            <td>Cycle through fields (trapped in modal)</td>
          </tr>
        </tbody>
      </table>
    </GenericModal>
  );
};
