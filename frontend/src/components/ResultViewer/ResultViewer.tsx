import { useState, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Heading,
  HStack,
  VStack,
  Text,
  Spinner,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react'
import { api } from '../../services/api'
import { TabPanelContent } from './TabPanelContent'

export interface ResultViewerProps {
  filePath: string
  isOpen: boolean
  onClose: () => void
  defaultTab: number
  availableMethods: {
    mafft: boolean;
    uclust: boolean;
  }
  bluebaseResult?: {
    alignment_stats_file: string;
    gap_stats_file: string;
    created_at: string;
  }
  originalMethod: 'mafft' | 'uclust';
}

export const ResultViewer = ({ 
  filePath, 
  isOpen, 
  onClose, 
  defaultTab,
  availableMethods,
  bluebaseResult,
  originalMethod
}: ResultViewerProps) => {
  const [mafftContent, setMafftContent] = useState<string>('')
  const [uclustContent, setUclustContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState(defaultTab)
  const toast = useToast()
  const [alignmentStats, setAlignmentStats] = useState<string>('')
  const [gapStats, setGapStats] = useState<string>('')

  // 결과 가져오기 함수
  const fetchContent = async (tabIndex: number) => {
    if (!filePath || !isOpen) return;

    const baseFilename = filePath.replace('_result.fasta', '')
                               .replace('_mafft', '')
                               .replace('_uclust', '');

    setLoading(true);
    try {
      // 정렬 결과만 탭에 따라 다르게 가져오기
      if (tabIndex === 0) {
        const mafftText = await fetchResult(`${baseFilename}_mafft_result.fasta`);
        setMafftContent(mafftText);
      } else {
        const uclustText = await fetchResult(`${baseFilename}_uclust_result.fasta`);
        setUclustContent(uclustText);
      }

      // BlueBase 결과는 originalMethod의 것을 가져오기
      if (bluebaseResult) {
        const alignStats = await fetchResult(`${baseFilename}_${originalMethod}_result_bluebase.txt`);
        const gapStatsText = await fetchResult(`${baseFilename}_${originalMethod}_result_bluebase_gapStat.log`);
        setAlignmentStats(alignStats);
        setGapStats(gapStatsText);
      }
    } finally {
      setLoading(false);
    }
  };

  // defaultTab이 변경될 때 currentTab과 content 업데이트
  useEffect(() => {
    setCurrentTab(defaultTab);
    fetchContent(defaultTab);
  }, [defaultTab, filePath, isOpen]);

  // 탭 변경 핸들러
  const handleTabChange = (index: number) => {
    // 선택하려는 탭의 결과가 있는지 확인
    const isTabAvailable = index === 0 ? availableMethods.mafft : availableMethods.uclust;
    
    if (isTabAvailable) {
      setCurrentTab(index);
      fetchContent(index);
    }
  };

  // 상태 초기화 함수
  const resetState = () => {
    setMafftContent('')
    setUclustContent('')
    setAlignmentStats('')
    setGapStats('')
  }

  // onClose 핸들러
  const handleClose = () => {
    resetState()
    onClose()
  }

  // 결과 가져오기 함수
  const fetchResult = async (filename: string) => {
    try {
      const text = await api.getResult(filename);
      return text;
    } catch (error) {
      toast({
        title: '결과 파일을 불러오는데 실패했습니다.',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
      });
      return '';
    }
  };

  const downloadFile = async () => {
    if (!filePath) return;
    try {
      const baseFilename = filePath.replace('_result.fasta', '')
                               .replace('_mafft', '')
                               .replace('_uclust', '');
      const method = currentTab === 0 ? 'mafft' : 'uclust';
      const downloadFilename = `${baseFilename}_${method}_result.fasta`;
      
      await api.downloadResult(downloadFilename);
    } catch (error) {
      toast({
        title: '파일 다운로드에 실패했습니다.',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const downloadBluebaseFile = async (fileType: 'alignment' | 'gap') => {
    if (!bluebaseResult) return;
    
    try {
      const baseFilename = filePath.replace('_result.fasta', '')
                               .replace('_mafft', '')
                               .replace('_uclust', '');
      const method = currentTab === 0 ? 'mafft' : 'uclust';
      const filename = fileType === 'alignment' 
        ? `${baseFilename}_${method}_result_bluebase.txt`
        : `${baseFilename}_${method}_result_bluebase_gapStat.log`;
        
      if (filename) {
        await api.downloadResult(filename);
      }
    } catch (error) {
      toast({
        title: '파일 다운로드에 실패했습니다.',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="90vh">
        <ModalHeader bg="brand.primary" py={4}>
          <HStack justify="space-between">
            <Heading size="md" color="brand.light">분석 결과</Heading>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="brand.light" onClick={handleClose} />
        
        <ModalBody p={4} overflow="hidden">
          {loading ? (
            <VStack py={8}>
              <Spinner size="xl" color="brand.primary" />
              <Text color="brand.primary">결과를 불러오는 중...</Text>
            </VStack>
          ) : (
            <Tabs 
              isFitted 
              variant="enclosed" 
              h="full"
              onChange={handleTabChange}
              index={currentTab}
            >
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
                    content={mafftContent}
                    alignmentStats={alignmentStats}
                    gapStats={gapStats}
                    bluebaseResult={bluebaseResult}
                    onDownload={downloadFile}
                    onBluebaseDownload={downloadBluebaseFile}
                  />
                </TabPanel>
                <TabPanel h="full" p={0}>
                  <TabPanelContent 
                    content={uclustContent}
                    alignmentStats={alignmentStats}
                    gapStats={gapStats}
                    bluebaseResult={bluebaseResult}
                    onDownload={downloadFile}
                    onBluebaseDownload={downloadBluebaseFile}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 