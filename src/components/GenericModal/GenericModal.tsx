import { Box } from "@chakra-ui/react";
import { useActiveOverlay, Overlay } from "@/store/OverlayStore";

type ModalProps = {
  children: React.ReactNode;
  overlay: Overlay;
};

export const GenericModal = ({ children, overlay }: ModalProps) => {
  const activeOverlay = useActiveOverlay();

  const isOpen = activeOverlay === overlay;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
        zIndex: 101,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        bg="black"
        borderRadius="md"
        p={6}
        width={"50%"}
        boxShadow="lg"
        border="1px solid #999"
      >
        {children}
      </Box>
    </div>
  );
};
