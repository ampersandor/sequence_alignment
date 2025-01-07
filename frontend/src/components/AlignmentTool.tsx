import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Button,
  Card,
  CardHeader,
  CardBody,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  useToast,
  Spinner,
} from '@chakra-ui/react'
import { FaUpload, FaPlay, FaCalculator } from 'react-icons/fa'
import { ResultViewer } from './ResultViewer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const AlignmentTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [resultFile, setResultFile] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [executedMethods, setExecutedMethods] = useState<{
    mafft: boolean;
    uclust: boolean;
  }>({
    mafft: false,
    uclust: false,
  })
  const [selectedTab, setSelectedTab] = useState(0)
  const toast = useToast()
  const [completedMethods, setCompletedMethods] = useState<{
    mafft: boolean;
    uclust: boolean;
  }>({
    mafft: false,
    uclust: false,
  })
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!taskId || !isPolling) return

    try {
      const response = await fetch(`${API_URL}/status/${taskId}`)
      const data = await response.json()
      
      setStatus(data.status)
      
      if (data.status === 'SUCCESS') {
        setResultFile(data.result?.result_file || null)
        setIsPolling(false)
        const method = data.result?.result_file.includes('mafft') ? 'mafft' : 'uclust'
        setCompletedMethods(prev => ({
          ...prev,
          [method]: true
        }))
        toast({
          title: '분석이 완료되었습니다.',
          status: 'success',
          duration: 5000,
        })

        // 분석 완료 시 부모 컴포넌트에 알림
        window.dispatchEvent(new Event('analysisUpdated'))
      } else if (data.status === 'FAILURE' || data.error) {
        setIsPolling(false)
        toast({
          title: '분석 중 오류가 발생했습니다.',
          description: data.error,
          status: 'error',
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Status check failed:', error)
      setIsPolling(false)
      toast({
        title: '상태 확인 중 오류가 발생했습니다.',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: 'error',
        duration: 5000,
      })
    }
  }, [taskId, toast, isPolling])

  useEffect(() => {
    if (!taskId || !isPolling) return

    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [taskId, isPolling, checkStatus])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setTaskId(null)
      setStatus(null)
      setResultFile(null)
      setShowResult(false)
      setIsPolling(false)
      setExecutedMethods({
        mafft: false,
        uclust: false
      })
      setCompletedMethods({
        mafft: false,
        uclust: false
      })
    }
  }

  const runAlignment = async (method: 'mafft' | 'uclust') => {
    if (!selectedFile) {
      toast({
        title: '파일을 먼저 선택해주세요.',
        status: 'error',
        duration: 3000,
      })
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('method', method)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

      const response = await fetch(`${API_URL}/alignment`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setTaskId(data.task_id)
      setIsPolling(true)
      
      setExecutedMethods(prev => ({
        ...prev,
        [method]: true
      }))
      
      toast({
        title: '분석이 시작되었습니다.',
        status: 'info',
        duration: 5000,
      })
    } catch (error) {
      console.error('Alignment request failed:', error)
      toast({
        title: '에러가 발생했습니다.',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const runBluebase = async (method: 'mafft' | 'uclust') => {
    if (!selectedFile) return;

    try {
      const filename = selectedFile.name.split('.')[0];
      const response = await fetch(`${API_URL}/bluebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
          method: method
        }),
      });

      if (!response.ok) {
        throw new Error('Bluebase calculation failed');
      }

      toast({
        title: `${method.toUpperCase()} Bluebase 계산이 완료되었습니다.`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: `${method.toUpperCase()} Bluebase 계산 중 오류가 발생했습니다.`,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const fetchResult = async (filename: string) => {
    try {
      const response = await fetch(`${API_URL}/results/${filename}`);
      if (!response.ok) throw new Error('Failed to fetch result');
      
      // 텍스트로 읽기
      const text = await response.text();
      
      // 줄바꿈 처리 보존
      const formattedText = text
        .split('\n')
        .map(line => line.trim())
        .join('\n');
      
      // 결과 표시
      setResult(formattedText);
    } catch (error) {
      console.error('Error fetching result:', error);
    }
  };

  return (
    <Box w="full">
      <VStack spacing={8}>
        <Heading 
          size="xl" 
          color="brand.primary"
          letterSpacing="tight"
        >
          시퀀스 정렬 도구
        </Heading>
        <Card w="full">
          <CardBody bg="brand.light" p={8}>
            <VStack spacing={6}>
              <Box w="full">
                <input
                  type="file"
                  accept=".fasta,.fa"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button
                    as="span"
                    w="full"
                    bg="brand.primary"
                    color="brand.light"
                    borderRadius="lg"
                    variant="solid"
                    leftIcon={<FaUpload />}
                    size="lg"
                    h="60px"
                    fontSize="lg"
                    _hover={{
                      bg: "brand.primaryLight",
                    }}
                  >
                    FASTA 파일 선택
                  </Button>
                </label>
              </Box>

              {selectedFile && (
                <Card 
                  w="full" 
                  variant="outline"
                  bg="brand.light"
                  p={1}
                >
                  <CardBody>
                    <VStack spacing={6}>
                      <Text 
                        color="brand.primary"
                        fontSize="lg"
                        fontWeight="500"
                      >
                        선택된 파일: <strong>{selectedFile.name}</strong>
                      </Text>
                      <HStack spacing={4} w="full">
                        <Button
                          bg="brand.primary"
                          color="brand.light"
                          variant="solid"
                          _hover={{
                            bg: "brand.primaryLight",
                          }}
                          onClick={() => runAlignment('mafft')}
                          isDisabled={!!taskId && status !== 'SUCCESS' && status !== 'FAILURE'}
                          leftIcon={<FaPlay />}
                          flex={1}
                          h="50px"
                        >
                          MAFFT 실행
                        </Button>
                        <Button
                          bg="brand.primary"
                          color="brand.light"
                          variant="solid"
                          onClick={() => runAlignment('uclust')}
                          isDisabled={!!taskId && status !== 'SUCCESS' && status !== 'FAILURE'}
                          leftIcon={<FaPlay />}
                          flex={1}
                          h="50px"
                          _hover={{
                            bg: "brand.primaryLight",
                          }}
                        >
                          UCLUST 실행
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {taskId && status && status !== 'SUCCESS' && status !== 'FAILURE' && (
                <Card bg="brand.neutral" p={4} w="full">
                  <HStack spacing={3} justify="center">
                    <Spinner color="brand.primary" />
                    <Text 
                      color="brand.primary" 
                      fontSize="lg"
                      fontWeight="500"
                    >
                      분석 진행 중... ({status})
                    </Text>
                  </HStack>
                </Card>
              )}

              {resultFile && (
                <VStack spacing={4} w="full">
                  <HStack spacing={4} w="full">
                    {completedMethods.mafft && (
                      <VStack spacing={4} w="full">
                        <Button
                          bg="brand.neutral"
                          color="brand.light"
                          onClick={() => {
                            setSelectedTab(0)
                            setIsResultModalOpen(true)
                          }}
                          w="full"
                          size="lg"
                          h="50px"
                          fontSize="lg"
                          fontWeight="500"
                          variant="solid"
                          _hover={{
                            bg: "brand.neutralLight",
                          }}
                        >
                          MAFFT 결과 보기
                        </Button>
                        <Button
                          bg="brand.primary"
                          color="brand.light"
                          onClick={() => runBluebase('mafft')}
                          w="full"
                          size="lg"
                          h="50px"
                          fontSize="lg"
                          fontWeight="500"
                          leftIcon={<FaCalculator />}
                          variant="solid"
                          _hover={{
                            bg: "brand.primaryLight",
                          }}
                        >
                          MAFFT Bluebase 계산
                        </Button>
                      </VStack>
                    )}
                    
                    {completedMethods.uclust && (
                      <VStack spacing={4} w="full">
                        <Button
                          bg="brand.neutral"
                          color="brand.light"
                          onClick={() => {
                            setSelectedTab(1)
                            setIsResultModalOpen(true)
                          }}
                          w="full"
                          size="lg"
                          h="50px"
                          fontSize="lg"
                          fontWeight="500"
                          variant="solid"
                          _hover={{
                            bg: "brand.neutralLight",
                          }}
                        >
                          UCLUST 결과 보기
                        </Button>
                        <Button
                          bg="brand.primary"
                          color="brand.light"
                          onClick={() => runBluebase('uclust')}
                          w="full"
                          size="lg"
                          h="50px"
                          fontSize="lg"
                          fontWeight="500"
                          leftIcon={<FaCalculator />}
                          variant="solid"
                          _hover={{
                            bg: "brand.primaryLight",
                          }}
                        >
                          UCLUST Bluebase 계산
                        </Button>
                      </VStack>
                    )}
                  </HStack>
                </VStack>
              )}

              <ResultViewer
                filePath={resultFile || ''}
                apiUrl={API_URL}
                isOpen={isResultModalOpen}
                onClose={() => setIsResultModalOpen(false)}
                defaultTab={selectedTab}
              />
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
} 