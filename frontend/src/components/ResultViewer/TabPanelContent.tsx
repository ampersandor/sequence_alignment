import { VStack } from '@chakra-ui/react'
import { ResultContent } from './ResultContent'
import { DownloadButtons } from './DownloadButtons'
import { BluebaseResults } from './BluebaseResults'

interface TabPanelContentProps {
  content: string;
  alignmentStats: string;
  gapStats: string;
  bluebaseResult?: {
    alignment_stats_file: string;
    gap_stats_file: string;
    created_at: string;
  };
  onDownload: () => Promise<void>;
  onBluebaseDownload: (type: 'alignment' | 'gap') => Promise<void>;
}

export const TabPanelContent = ({
  content,
  alignmentStats,
  gapStats,
  bluebaseResult,
  onDownload,
  onBluebaseDownload
}: TabPanelContentProps) => (
  <VStack h="30vh" spacing={4}>
    {bluebaseResult && (
      <DownloadButtons 
        onDownload={onDownload} 
        onBluebaseDownload={onBluebaseDownload} 
      />
    )}
    <ResultContent content={content} />
    {bluebaseResult && (
      <BluebaseResults 
        alignmentStats={alignmentStats} 
        gapStats={gapStats} 
      />
    )}
  </VStack>
); 