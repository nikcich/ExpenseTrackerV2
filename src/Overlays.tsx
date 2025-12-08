import { DateRangeModal } from "./components/DateRangeModal/DateRangeModal";
import { EditModal } from "./components/EditModal/EditModal";

const Modals = [DateRangeModal, EditModal];

export const Overlays = () => {
  return (
    <>
      {Modals.map((ModalComponent, index) => (
        <ModalComponent key={index} />
      ))}
    </>
  );
};
