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

        // MAFFT 결과 가져오기
        const mafftResponse = await fetch(`${apiUrl}/results/${baseName}_mafft_result.fasta`)
        if (mafftResponse.ok) {
          const mafftText = await mafftResponse.text()
          setMafftContent(mafftText)
        }

        // UCLUST 결과 가져오기
        const uclustResponse = await fetch(`${apiUrl}/results/${baseName}_uclust_result.fasta`)
        if (uclustResponse.ok) {
          const uclustText = await uclustResponse.text()
          setUclustContent(uclustText)
        }

      } catch (error) {
        console.error('Error fetching result:', error)
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
                    color: '#000000'
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
                    color: '#000000'
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