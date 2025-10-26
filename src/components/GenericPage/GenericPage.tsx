import { Heading } from "@chakra-ui/react";
import styles from "./GenericPage.module.scss";
import { JSX } from "react";

export const GenericPage = ({
  actions,
  title,
  children,
  footer,
}: {
  actions?: JSX.Element;
  title: string;
  children: React.ReactNode;
  footer?: JSX.Element;
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Heading size="xl">{title}</Heading>

        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.children}>{children}</div>

      <div className={styles.footer}>{footer}</div>
    </div>
  );
};
