import { CreateExpenseModal } from "./components/CreateExpenseModal/CreateExpenseModal";
import { DateRangeModal } from "./components/DateRangeModal/DateRangeModal";
import { EditModal } from "./components/EditModal/EditModal";
import { TagModal } from "./components/TagModal/TagModal";
import { SettingsModal } from "./pages/Settings/SettingsModal";

const Modals = [DateRangeModal, EditModal, CreateExpenseModal, TagModal, SettingsModal];

export const Overlays = () => {
  return (
    <>
      {Modals.map((ModalComponent, index) => (
        <ModalComponent key={index} />
      ))}
    </>
  );
};
