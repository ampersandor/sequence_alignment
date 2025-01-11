import { Box, Text } from '@chakra-ui/react'

interface ResultContentProps {
  content: string;
  title?: string;
  maxHeight?: string;
  width?: string;
}

export const ResultContent = ({ 
  content, 
  title = "Alignment Result",
  maxHeight = "calc(100% - 40px)",
  width = "full",
}: ResultContentProps) => (
  <Box w={width} h={maxHeight} gap={4} p={4} borderRadius="md" boxShadow="sm" border="1px solid #e0e0e0">
    <Text fontWeight="500" color="brand.primary" mb={2}>{title}</Text>
    <Box
      w="full"
      overflowX="auto"
      overflowY="auto"
      bg="white"
      p={4}
      h={maxHeight}
    >
      <pre style={{
        whiteSpace: 'pre',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        width: '100%',
        wordBreak: 'break-all',
        overflowWrap: 'break-word'
      }}>
        {content}
      </pre>
    </Box>
  </Box>
);
