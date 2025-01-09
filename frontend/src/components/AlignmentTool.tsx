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
import { FaUpload, FaPlay, FaCalculator, FaFile, FaPlus } from 'react-icons/fa'
import { ResultViewer } from './ResultViewer'
import { api } from '../services/api'
import { AlignmentMethod, TaskStatus } from '../types/common'

export const AlignmentTool = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [resultFile, setResultFile] = useState<string | null>(null)
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
    if (!taskId || !isPolling) return;

    try {
      const data = await api.checkStatus(taskId);
      setStatus(data.status);
      
      if (data.status === 'SUCCESS') {
        handleSuccess(data);
      } else if (data.status === 'FAILURE' || data.error) {
        handleError(data.error);
      }
    } catch (error) {
      handleError(error);
    }
  }, [taskId, isPolling]);

  const handleSuccess = (data: TaskStatus) => {
    setResultFile(data.result?.result_file || null);
    setIsPolling(false);
    const method = data.result?.result_file?.includes('mafft') ? 'mafft' : 'uclust';
    setCompletedMethods(prev => ({
      ...prev,
      [method]: true
    }));
    toast({
      title: '분석이 완료되었습니다.',
      status: 'success',
      duration: 5000,
    });
    window.dispatchEvent(new Event('analysisUpdated'));
  };

  const handleError = (error: any) => {
    setIsPolling(false);
    toast({
      title: '분석 중 오류가 발생했습니다.',
      description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      status: 'error',
      duration: 5000,
    });
  };

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

  const createAlignJob = async () => {
    if (!selectedFile) {
      toast({
        title: '파일을 먼저 선택해주세요.',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const data = await api.uploadFile(selectedFile);
      setUploadId(data.id);
      
      toast({
        title: '작업이 생성되었습니다.',
        description: '이제 MAFFT나 UCLUST를 실행할 수 있습니다.',
        status: 'success',
        duration: 3000,
      });

      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      window.dispatchEvent(new Event('analysisUpdated'));
    } catch (error) {
      handleError(error);
    }
  };

  const runAlignment = async (method: AlignmentMethod) => {
    if (!uploadId) return;

    try {
      const data = await api.startAnalysis(uploadId, method);
      setTaskId(data.task_id);
      setIsPolling(true);
      setExecutedMethods(prev => ({
        ...prev,
        [method]: true
      }));
      
      toast({
        title: '분석이 시작되었습니다.',
        status: 'info',
        duration: 5000,
      });
    } catch (error) {
      handleError(error);
    }
  };

  const runBluebase = async (method: AlignmentMethod) => {
    if (!selectedFile) return;

    try {
      const filename = selectedFile.name.split('.')[0];
      await api.calculateBluebase(filename, method);

      toast({
        title: `${method.toUpperCase()} Bluebase 계산이 완료되었습니다.`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <Box w="full">
      <VStack spacing={8}>
        <Card w="full">
          <CardBody bg="brand.light" p={8}>
            <VStack spacing={6} align="center" maxW="900px" mx="auto">
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
                <HStack spacing={4} w="full" align="center" justify="center">
                  <HStack 
                    flex={1}
                    maxW="600px"
                    p={4} 
                    bg="gray.50" 
                    borderRadius="lg"
                    border="1px"
                    borderColor="gray.200"
                  >
                    <Box
                      bg="brand.primary"
                      p={2}
                      borderRadius="md"
                      color="white"
                    >
                      <FaFile />
                    </Box>
                    <Text color="gray.700" fontSize="lg" fontWeight="500">
                      {selectedFile.name}
                    </Text>
                  </HStack>
                  
                  {!uploadId && (
                    <Button
                      colorScheme="green"
                      size="lg"
                      h="50px"
                      px={8}
                      leftIcon={<FaPlus />}
                      onClick={createAlignJob}
                      _hover={{
                        transform: "translateY(-2px)",
                        boxShadow: "lg",
                      }}
                      _active={{
                        transform: "translateY(0)",
                      }}
                      transition="all 0.2s"
                    >
                      작업 생성
                    </Button>
                  )}
                </HStack>
              )}
              
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
} 