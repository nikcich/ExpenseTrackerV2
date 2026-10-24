import { Box } from "@chakra-ui/react";
import { useActiveOverlay, Overlay, closeAllOverlays } from "@/store/OverlayStore";
import { useEffect, useRef } from "react";
import cx from "classnames";
import styles from "./GenericModal.module.scss";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  children: React.ReactNode;
  overlay: Overlay;
  fullscreen?: boolean;
};

export const GenericModal = ({ children, overlay, fullscreen = false }: ModalProps) => {
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
      className={cx(styles.backdrop, fullscreen && styles.fullscreen)}
    >
      <Box
        bg="bg.panel"
        borderRadius={fullscreen ? "lg" : "xl"}
        p={fullscreen ? 6 : 5}
        width={fullscreen ? "100%" : "clamp(320px, 50%, 640px)"}
        height={fullscreen ? "100%" : undefined}
        maxHeight={fullscreen ? "100%" : "80vh"}
        maxWidth={fullscreen ? undefined : "calc(100vw - 48px)"}
        overflow={fullscreen ? "hidden" : "auto"}
        boxShadow="lg"
        borderWidth="1px"
        borderColor="border.DEFAULT"
        textAlign="left"
      >
        {children}
      </Box>
    </div>
  );
};
