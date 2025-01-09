import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Badge,
  IconButton,
  Button,
  useToast,
  HStack,
  Spinner,
} from '@chakra-ui/react'
import { FaDownload, FaSync, FaCalculator, FaEye, FaPlay } from 'react-icons/fa'
import { Upload } from '../types/upload'
import { usePolling } from '../hooks/usePolling'
import { ResultViewer } from './ResultViewer'
import { api } from '../services/api'
import { AlignmentMethod } from '../types/common'

export const AnalysisHistory = () => {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<Upload['analyses'][0] | null>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)
  const [isPollingEnabled, setIsPollingEnabled] = useState(true)
  const toast = useToast()

  const fetchUploads = async () => {
    try {
      const data = await api.getUploads();
      console.log(data);
      setUploads(data);
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error: any) => {
    toast({
      title: '오류가 발생했습니다.',
      description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      status: 'error',
      duration: 5000,
    });
  };

  const allAnalysesCompleted = useCallback(() => {
    return uploads.every(upload => 
      upload.analyses?.every(analysis => 
        ['SUCCESS', 'FAILURE'].includes(analysis.status)
      ) ?? true
    );
  }, [uploads]);

  const hasOngoingAnalysis = useCallback(() => {
    return uploads.some(upload => 
      upload.analyses?.some(analysis => 
        ['PENDING', 'STARTED'].includes(analysis.status)
      ) ?? false
    );
  }, [uploads]);

  useEffect(() => {
    if (allAnalysesCompleted() && !hasOngoingAnalysis()) {
      setIsPollingEnabled(false);
    } else {
      setIsPollingEnabled(true);
    }
  }, [uploads, allAnalysesCompleted, hasOngoingAnalysis]);

  usePolling(fetchUploads, 10000, {
    onError: handleError,
    enabled: isPollingEnabled
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPollingEnabled(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    const element = document.getElementById('analysis-history');
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // 초기 데이터 로드
    fetchUploads();

    // 이벤트 리스너 등록
    const handleAnalysisUpdate = () => {
      fetchUploads();
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const statusProps = {
      PENDING: { colorScheme: 'yellow', text: '진행 중' },
      SUCCESS: { colorScheme: 'green', text: '완료' },
      FAILURE: { colorScheme: 'red', text: '실패' },
      STARTED: { colorScheme: 'blue', text: '시작됨' },
    }[status] || { colorScheme: 'gray', text: status }

    return <Badge colorScheme={statusProps.colorScheme}>{statusProps.text}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const downloadOriginal = async (filename: string) => {
    try {
      await api.downloadResult(filename);
    } catch (error) {
      handleError(error);
    }
  };

  const runAnalysis = async (uploadId: number, method: AlignmentMethod) => {
    try {
      await api.startAnalysis(uploadId, method);
      setIsPollingEnabled(true);
      toast({
        title: '분석이 시작되었습니다.',
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      handleError(error);
    }
  };

  const runBluebase = async (method: AlignmentMethod) => {
    if (!selectedAnalysis) return;

    try {
      const filename = selectedAnalysis.result_file?.split('_')[0];
      if (!filename) throw new Error('Invalid filename');
      
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

  const viewResult = (analysisId: number, method: AlignmentMethod) => {
    const upload = uploads.find(u => 
      u.analyses.some(a => a.id === analysisId && a.method === method && a.status === 'SUCCESS')
    );
    
    if (upload) {
      const foundAnalysis = upload.analyses.find(a => 
        a.id === analysisId && a.method === method && a.status === 'SUCCESS'
      );
      if (foundAnalysis) {
        setSelectedAnalysis(foundAnalysis);
        setSelectedTab(method === 'mafft' ? 0 : 1);
        setIsResultModalOpen(true);
      }
    }
  };

  return (
    <Card variant="outline" w="full" mt={8}id="analysis-history">
      <CardHeader bg="brand.primary" py={4}>
        <HStack justify="space-between">
          <Heading size="md" color="brand.light">로드된 파일</Heading>
          <IconButton
            aria-label="Refresh"
            icon={<FaSync />}
            size="sm"
            colorScheme="whiteAlpha"
            onClick={fetchUploads}
          />
        </HStack>
      </CardHeader>
      <CardBody p={0}>
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>파일명</Th>
                <Th>업로드 시각</Th>
                <Th>MAFFT</Th>
                <Th>UCLUST</Th>
                <Th>액션</Th>
              </Tr>
            </Thead>
            <Tbody>
              {uploads.map((upload) => (
                <Tr key={upload.id}>
                  <Td>{upload.filename}</Td>
                  <Td>{formatDate(upload.created_at)}</Td>
                  <Td>
                    {upload.analyses?.find(a => a.method === 'mafft')?.status === 'SUCCESS' ? (
                      <HStack>
                        <Badge colorScheme="green">완료</Badge>
                        <IconButton
                          aria-label="View MAFFT result"
                          icon={<FaEye />}
                          size="sm"
                          onClick={() => {
                            const mafftAnalysis = upload.analyses.find(a => a.method === 'mafft');
                            if (mafftAnalysis) {
                              viewResult(mafftAnalysis.id, 'mafft');
                            }
                          }}
                        />
                        <IconButton
                          aria-label="Run Bluebase"
                          icon={<FaCalculator />}
                          size="sm"
                          onClick={() => {
                            const mafftAnalysis = upload.analyses.find(a => a.method === 'mafft' && a.status === 'SUCCESS');
                            if (mafftAnalysis) {
                              runBluebase('mafft');
                            }
                          }}
                        />
                      </HStack>
                    ) : upload.analyses?.find(a => a.method === 'mafft')?.status === 'PENDING' || 
                        upload.analyses?.find(a => a.method === 'mafft')?.status === 'STARTED' ? (
                      <HStack>
                        <Spinner size="sm" color="brand.primary" />
                        <Badge colorScheme="yellow">진행 중</Badge>
                      </HStack>
                    ) : upload.analyses?.find(a => a.method === 'mafft')?.status === 'FAILURE' ? (
                      <HStack>
                        <Badge colorScheme="red">실패</Badge>
                        <IconButton
                          aria-label="Retry MAFFT"
                          icon={<FaSync />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => runAnalysis(upload.id, 'mafft')}
                        />
                      </HStack>
                    ) : (
                      <IconButton
                        aria-label="Run MAFFT"
                        icon={<FaPlay />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => runAnalysis(upload.id, 'mafft')}
                      />
                    )}
                  </Td>
                  <Td>
                    {upload.analyses?.find(a => a.method === 'uclust')?.status === 'SUCCESS' ? (
                      <HStack>
                        <Badge colorScheme="green">완료</Badge>
                        <IconButton
                          aria-label="View UCLUST result"
                          icon={<FaEye />}
                          size="sm"
                          onClick={() => {
                            const uclustAnalysis = upload.analyses.find(a => a.method === 'uclust');
                            if (uclustAnalysis) {
                              viewResult(uclustAnalysis.id, 'uclust');
                            }
                          }}
                        />
                        <IconButton
                          aria-label="Run Bluebase"
                          icon={<FaCalculator />}
                          size="sm"
                          onClick={() => {
                            const uclustAnalysis = upload.analyses.find(a => a.method === 'uclust' && a.status === 'SUCCESS');
                            if (uclustAnalysis) {
                              runBluebase('uclust');
                            }
                          }}
                        />
                      </HStack>
                    ) : upload.analyses?.find(a => a.method === 'uclust')?.status === 'PENDING' ? (
                      <HStack>
                        <Spinner size="sm" />
                        <Badge colorScheme="yellow">진행 중</Badge>
                      </HStack>
                    ) : upload.analyses?.find(a => a.method === 'uclust')?.status === 'FAILURE' ? (
                      <HStack>
                        <Badge colorScheme="red">실패</Badge>
                        <Button
                          leftIcon={<FaPlay />}
                          size="sm"
                          onClick={() => runAnalysis(upload.id, 'uclust')}
                        >
                          재시도
                        </Button>
                      </HStack>
                    ) : (
                      <Button
                        leftIcon={<FaPlay />}
                        size="sm"
                        onClick={() => runAnalysis(upload.id, 'uclust')}
                      >
                        실행
                      </Button>
                    )}
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Download original"
                      icon={<FaDownload />}
                      size="sm"
                      onClick={() => downloadOriginal(upload.filename)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </CardBody>

      <ResultViewer
        filePath={selectedAnalysis?.result_file || ''}
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        defaultTab={selectedTab}
        showBluebaseButton={true}
        onBluebaseClick={() => selectedAnalysis && runBluebase(selectedAnalysis.method as AlignmentMethod)}
      />
    </Card>
  )
} 