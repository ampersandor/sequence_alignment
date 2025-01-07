import { useState, useEffect } from 'react'
import {
  Box,
  Button,
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
import { FaDownload } from 'react-icons/fa'

interface ResultViewerProps {
  filePath: string
  apiUrl: string
  isOpen: boolean
  onClose: () => void
  defaultTab: number
}

export const ResultViewer = ({ filePath, apiUrl, isOpen, onClose, defaultTab }: ResultViewerProps) => {
  const [mafftContent, setMafftContent] = useState<string>('')
  const [uclustContent, setUclustContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    const fetchContent = async () => {
      try {
        if (!filePath) return;

        const baseFilename = filePath.replace('_result.fasta', '')
                                   .replace('_mafft', '')
                                   .replace('_uclust', '')

        // 현재 실행된 방법 확인
        const isMafft = filePath.includes('mafft')
        const isUclust = filePath.includes('uclust')

        console.log('Attempting to fetch results for:', {
          baseFilename,
          filePath,
          isMafft,
          isUclust
        })

        // MAFFT 결과만 가져오기
        if (isMafft) {
          const mafftResponse = await fetch(`${apiUrl}/results/${baseFilename}_mafft_result.fasta`, {
            method: 'GET',
            headers: {
              'Accept': 'text/plain',
            },
          })
          
          if (!mafftResponse.ok) {
            throw new Error(`MAFFT fetch failed: ${mafftResponse.statusText}`)
          }

          const mafftText = await mafftResponse.text()
          setMafftContent(mafftText)
        }

        // UCLUST 결과만 가져오기
        if (isUclust) {
          const uclustResponse = await fetch(`${apiUrl}/results/${baseFilename}_uclust_result.fasta`, {
            method: 'GET',
            headers: {
              'Accept': 'text/plain',
            },
          })
          
          if (!uclustResponse.ok) {
            throw new Error(`UCLUST fetch failed: ${uclustResponse.statusText}`)
          }

          const uclustText = await uclustResponse.text()
          setUclustContent(uclustText)
        }

      } catch (error) {
        console.error('Error in fetchContent:', error)
        toast({
          title: '결과 파일을 불러오는데 실패했습니다.',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
          status: 'error',
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [filePath, apiUrl, toast])

  // pre 태그 렌더링 전에 내용 로깅
  useEffect(() => {
  }, [mafftContent, uclustContent])

  const downloadFile = (type: 'mafft' | 'uclust') => {
    if (!filePath) return;
    const baseFilename = filePath.replace('_result.fasta', '')
                                .replace('_mafft', '')
                                .replace('_uclust', '')
    window.open(`${apiUrl}/results/${baseFilename}_${type}_result.fasta`, '_blank')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="90vh">
        <ModalHeader bg="brand.primary" py={4}>
          <HStack justify="space-between">
            <Heading size="md" color="brand.light">분석 결과</Heading>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="brand.light" />
        
        <ModalBody p={4} overflow="hidden">
          {loading ? (
            <VStack py={8}>
              <Spinner size="xl" color="brand.primary" />
              <Text color="brand.primary">결과를 불러오는 중...</Text>
            </VStack>
          ) : (
            <Tabs isFitted variant="enclosed" defaultIndex={defaultTab} h="full">
              <TabList bg="gray.100" borderRadius="lg" p={1}>
                <Tab
                  _selected={{
                    color: 'brand.primary',
                    bg: 'white',
                    borderBottom: 'none',
                    borderRadius: 'md',
                    fontWeight: 'bold',
                    boxShadow: 'sm'
                  }}
                  _hover={{
                    bg: 'whiteAlpha.800'
                  }}
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  MAFFT 결과
                </Tab>
                <Tab
                  _selected={{
                    color: 'brand.primary',
                    bg: 'white',
                    borderBottom: 'none',
                    borderRadius: 'md',
                    fontWeight: 'bold',
                    boxShadow: 'sm'
                  }}
                  _hover={{
                    bg: 'whiteAlpha.800'
                  }}
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  UCLUST 결과
                </Tab>
              </TabList>

              <TabPanels h="calc(80vh - 120px)" overflow="hidden">
                <TabPanel h="full" p={0}>
                  <VStack h="full" spacing={0}>
                    <HStack justify="flex-end" w="full" p={4} bg="gray.50">
                      <Button
                        size="sm"
                        leftIcon={<FaDownload />}
                        onClick={() => downloadFile('mafft')}
                        variant="secondary"
                      >
                        MAFFT 결과 다운로드
                      </Button>
                    </HStack>
                    <Box
                      flex={1}
                      w="full"
                      overflowX="auto"
                      overflowY="auto"
                      bg="white"
                      p={4}
                    >
                      <pre style={{
                        whiteSpace: 'pre',
                        fontFamily: 'monospace',
                        color: '#000000',
                        lineHeight: '1.5',
                        fontSize: '14px'
                      }}>
                        {mafftContent}
                      </pre>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel h="full" p={0}>
                  <VStack h="full" spacing={0}>
                    <HStack justify="flex-end" w="full" p={4} bg="gray.50">
                      <Button
                        size="sm"
                        leftIcon={<FaDownload />}
                        onClick={() => downloadFile('uclust')}
                        variant="secondary"
                      >
                        UCLUST 결과 다운로드
                      </Button>
                    </HStack>
                    <Box
                      flex={1}
                      w="full"
                      overflowX="auto"
                      overflowY="auto"
                      bg="white"
                      p={4}
                    >
                      <pre style={{
                        whiteSpace: 'pre',
                        fontFamily: 'monospace',
                        color: '#000000',
                        lineHeight: '1.5',
                        fontSize: '14px'
                      }}>
                        {uclustContent}
                      </pre>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 