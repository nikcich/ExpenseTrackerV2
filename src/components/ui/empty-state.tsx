import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <Flex
    direction="column"
    align="center"
    justify="center"
    gap={4}
    height="100%"
    width="100%"
    px={6}
  >
    {icon && (
      <Box color="fg.muted" fontSize="3xl" opacity={0.5}>
        {icon}
      </Box>
    )}
    <Heading size="md" color="fg.muted" textAlign="center">
      {title}
    </Heading>
    {description && (
      <Text color="fg.subtle" textAlign="center" maxW="sm">
        {description}
      </Text>
    )}
    {action && <Box pt={2}>{action}</Box>}
  </Flex>
);
