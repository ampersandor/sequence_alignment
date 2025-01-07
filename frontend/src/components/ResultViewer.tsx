import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardBody,
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
import { FaDownload, FaTimes } from 'react-icons/fa'

interface ResultViewerProps {
  filePath: string
  apiUrl: string
  onClose: () => void
  defaultTab: number
}

export const ResultViewer = ({ filePath, apiUrl, onClose, defaultTab }: ResultViewerProps) => {
  const [mafftContent, setMafftContent] = useState<string>('')
  const [uclustContent, setUclustContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const filename = filePath.split('/').pop()
        const baseName = filename?.split('_')[0]
        
        console.log('Fetching results for:', {
          filePath,
          filename,
          baseName
        })

        // MAFFT 결과 가져오기
        const mafftResponse = await fetch(`${apiUrl}/results/${baseName}_mafft_result.fasta`)
        console.log('MAFFT Response:', {
          status: mafftResponse.status,
          statusText: mafftResponse.statusText,
          headers: Object.fromEntries(mafftResponse.headers.entries())
        })
        
        if (mafftResponse.ok) {
          const mafftText = await mafftResponse.text()
          console.log('MAFFT Raw Content:', mafftText)
          
          const formattedMafftText = mafftText
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
          console.log('MAFFT Formatted Content:', formattedMafftText)
          setMafftContent(formattedMafftText)
        }

        // UCLUST 결과 가져오기
        const uclustResponse = await fetch(`${apiUrl}/results/${baseName}_uclust_result.fasta`)
        console.log('UCLUST Response:', {
          status: uclustResponse.status,
          statusText: uclustResponse.statusText,
          headers: Object.fromEntries(uclustResponse.headers.entries())
        })
        
        if (uclustResponse.ok) {
          const uclustText = await uclustResponse.text()
          console.log('UCLUST Raw Content:', uclustText)
          
          const formattedUclustText = uclustText
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n')
          console.log('UCLUST Formatted Content:', formattedUclustText)
          setUclustContent(formattedUclustText)
        }

      } catch (error) {
        console.error('Error in fetchContent:', error)
        toast({
          title: '결과 파일을 불러오는데 실패했습니다.',
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
    console.log('Current MAFFT content:', mafftContent)
    console.log('Current UCLUST content:', uclustContent)
  }, [mafftContent, uclustContent])

  const downloadFile = (type: 'mafft' | 'uclust') => {
    const filename = filePath.split('/').pop()
    const baseName = filename?.split('_')[0]
    window.open(`${apiUrl}/results/${baseName}_${type}_result.fasta`, '_blank')
  }

  return (
    <Card variant="outline" w="full">
      <CardHeader bg="brand.primary" py={4}>
        <HStack justify="space-between">
          <Heading size="md" color="brand.light">분석 결과</Heading>
          <Button
            size="sm"
            leftIcon={<FaTimes />}
            onClick={onClose}
            variant="secondary"
          >
            닫기
          </Button>
        </HStack>
      </CardHeader>

      <CardBody p={0}>
        {loading ? (
          <VStack py={8}>
            <Spinner size="xl" color="brand.primary" />
            <Text color="brand.primary">결과를 불러오는 중...</Text>
          </VStack>
        ) : (
          <Tabs isFitted variant="enclosed" defaultIndex={defaultTab}>
            <TabList>
              <Tab
                _selected={{
                  color: 'brand.primary',
                  bg: 'white',
                  borderBottom: '1px solid',
                  borderColor: 'brand.primary',
                  fontWeight: 'bold'
                }}
              >
                MAFFT 결과
              </Tab>
              <Tab
                _selected={{
                  color: 'brand.primary',
                  bg: 'white',
                  borderBottom: '1px solid',
                  borderColor: 'brand.primary',
                  fontWeight: 'bold'
                }}
              >
                UCLUST 결과
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Box
                  w="full"
                  minW="max-content"
                  minH="400px"
                  maxH="600px"
                  overflowX="auto"
                  overflowY="auto"
                  bg="#FFFFFF"
                  p={4}
                >
                  <HStack justify="flex-end" mb={4}>
                    <Button
                      size="sm"
                      leftIcon={<FaDownload />}
                      onClick={() => downloadFile('mafft')}
                      variant="secondary"
                    >
                      MAFFT 결과 다운로드
                    </Button>
                  </HStack>
                  <pre style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    width: 'max-content',
                    minWidth: '100%',
                    whiteSpace: 'pre',
                    padding: '1rem',
                    margin: 0,
                    fontFamily: 'monospace',
                    color: '#000000',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}>
                    {mafftContent}
                  </pre>
                </Box>
              </TabPanel>
              <TabPanel>
                <Box
                  w="full"
                  minW="max-content"
                  minH="400px"
                  maxH="600px"
                  overflowX="auto"
                  overflowY="auto"
                  bg="#FFFFFF"
                  p={4}
                >
                  <HStack justify="flex-end" mb={4}>
                    <Button
                      size="sm"
                      leftIcon={<FaDownload />}
                      onClick={() => downloadFile('uclust')}
                      variant="secondary"
                    >
                      UCLUST 결과 다운로드
                    </Button>
                  </HStack>
                  <pre style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    width: 'max-content',
                    minWidth: '100%',
                    whiteSpace: 'pre',
                    padding: '1rem',
                    margin: 0,
                    fontFamily: 'monospace',
                    color: '#000000',
                    lineHeight: '1.5',
                    fontSize: '14px'
                  }}>
                    {uclustContent}
                  </pre>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </CardBody>
    </Card>
  )
} 