import { Box } from '@chakra-ui/react'
import { ResultContent } from './ResultContent'

interface BluebaseResultsProps {
  alignmentStats: string;
  gapStats: string;
}

export const BluebaseResults = ({ 
  alignmentStats, 
  gapStats, 
}: BluebaseResultsProps) => {
  return (
    <Box 
      w="full" 
      h="full"
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      gap={4}
    >
      <ResultContent 
        title="Alignment Statistics" 
        content={alignmentStats} 
        width="50%"
      />
      <ResultContent 
        title="Gap Statistics" 
        content={gapStats} 
        width="50%"
      />
    </Box>
  );
}; 