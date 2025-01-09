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
            <VStack spacing={6} align="stretch">
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
                <VStack spacing={4} w="full" align="stretch">
                  <Text color="brand.primary" fontSize="lg" fontWeight="500">
                    선택된 파일: <strong>{selectedFile.name}</strong>
                  </Text>
                  
                  {!uploadId && (
                    <Button
                      w="full"
                      bg="brand.primary"
                      color="white"
                      onClick={createAlignJob}
                      size="lg"
                      h="50px"
                      fontSize="lg"
                      fontWeight="500"
                      _hover={{
                        bg: "brand.secondaryLight",
                      }}
                      _active={{
                        bg: "brand.secondary",
                        transform: "scale(0.98)"
                      }}
                    >
                      작업 생성하기
                    </Button>
                  )}
                </VStack>
              )}
              
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
} 