import { Box } from "@chakra-ui/react";
import { useActiveOverlay, Overlay, closeAllOverlays } from "@/store/OverlayStore";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  children: React.ReactNode;
  overlay: Overlay;
};

export const GenericModal = ({ children, overlay }: ModalProps) => {
  const activeOverlay = useActiveOverlay();
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = activeOverlay === overlay;

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllOverlays();
        return;
      }

      if (e.key === "Enter") {
        const primary = containerRef.current?.querySelector<HTMLElement>(
          '[data-primary="true"]'
        );
        if (primary) {
          e.preventDefault();
          primary.click();
        }
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
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
        bg="bg.panel"
        borderRadius="xl"
        p={5}
        width="50%"
        boxShadow="lg"
        borderWidth="1px"
        borderColor="border.DEFAULT"
      >
        {children}
      </Box>
    </div>
  );
};
