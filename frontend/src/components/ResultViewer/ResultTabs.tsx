import { Tabs, TabList, TabPanels, Tab, TabPanel, VStack } from '@chakra-ui/react'
import { ResultContent } from './ResultContent'
import { DownloadButtons } from './DownloadButtons'
import { BluebaseResults } from './BluebaseResults'
import { ResultViewerProps } from './ResultViewer'
import { TabPanelContent } from './TabPanelContent'

interface ContentState {
  mafftContent: string;
  uclustContent: string;
  alignmentStats: string;
  gapStats: string;
}

interface ResultTabsProps extends ResultViewerProps {
  content: ContentState;
  availableMethods: {
    mafft: boolean;
    uclust: boolean;
  };
  onTabChange: (index: number) => void;
  onDownload: () => Promise<void>;
  onBluebaseDownload: (type: 'alignment' | 'gap') => Promise<void>;
  bluebaseResult?: {
    alignment_stats_file: string;
    gap_stats_file: string;
    created_at: string;
  };
}

export const ResultTabs = ({
  content,
  availableMethods,
  onTabChange,
  onDownload,
  onBluebaseDownload,
  bluebaseResult
}: ResultTabsProps) => (
  <Tabs isFitted variant="enclosed" h="full" onChange={onTabChange}>
    <TabList bg="gray.100" borderRadius="lg" p={1}>
      {['MAFFT 결과', 'UCLUST 결과'].map((label, idx) => (
        <Tab
          key={label}
          isDisabled={!availableMethods[idx === 0 ? 'mafft' : 'uclust']}
          _selected={{
            color: 'brand.primary',
            bg: 'white',
            borderBottom: 'none',
            borderRadius: 'md',
            fontWeight: 'bold',
            boxShadow: 'sm'
          }}
          _hover={{
            bg: availableMethods[idx === 0 ? 'mafft' : 'uclust'] ? 'whiteAlpha.800' : 'initial'
          }}
          _disabled={{
            cursor: 'not-allowed',
            opacity: 0.4,
            _hover: { bg: 'initial' }
          }}
          borderRadius="md"
          transition="all 0.2s"
        >
          {label}
        </Tab>
      ))}
    </TabList>

    <TabPanels h="calc(80vh - 120px)" overflow="hidden">
      <TabPanel h="full" p={0}>
        <TabPanelContent
          content={content.mafftContent}
          alignmentStats={content.alignmentStats}
          gapStats={content.gapStats}
          bluebaseResult={bluebaseResult}
          onDownload={onDownload}
          onBluebaseDownload={onBluebaseDownload}
        />
      </TabPanel>
      <TabPanel h="full" p={0}>
        <TabPanelContent
          content={content.uclustContent}
          alignmentStats={content.alignmentStats}
          gapStats={content.gapStats}
          bluebaseResult={bluebaseResult}
          onDownload={onDownload}
          onBluebaseDownload={onBluebaseDownload}
        />
      </TabPanel>
    </TabPanels>
  </Tabs>
);