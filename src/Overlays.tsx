import { CreateExpenseModal } from "./components/CreateExpenseModal/CreateExpenseModal";
import { DateRangeModal } from "./components/DateRangeModal/DateRangeModal";
import { EditModal } from "./components/EditModal/EditModal";

const Modals = [DateRangeModal, EditModal, CreateExpenseModal];

export const Overlays = () => {
  return (
    <>
      {Modals.map((ModalComponent, index) => (
        <ModalComponent key={index} />
      ))}
    </>
  );
};
