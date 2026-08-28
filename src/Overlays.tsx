import { CreateExpenseModal } from "./components/CreateExpenseModal/CreateExpenseModal";
import { DateRangeModal } from "./components/DateRangeModal/DateRangeModal";
import { EditModal } from "./components/EditModal/EditModal";
import { FilterModal } from "./components/FilterModal/FilterModal";
import { GlobalSearchModal } from "./components/GlobalSearchModal/GlobalSearchModal";
import { GroupModal } from "./components/GroupModal/GroupModal";
import { HelpModal } from "./components/HelpModal/HelpModal";
import { TagModal } from "./components/TagModal/TagModal";
import { SettingsModal } from "./pages/Settings/SettingsModal";

const Modals = [DateRangeModal, EditModal, CreateExpenseModal, TagModal, GroupModal, SettingsModal, HelpModal, FilterModal, GlobalSearchModal];

export const Overlays = () => {
  return (
    <>
      {Modals.map((ModalComponent, index) => (
        <ModalComponent key={index} />
      ))}
    </>
  );
};
