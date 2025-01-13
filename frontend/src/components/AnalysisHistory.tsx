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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react'
import { FaDownload, FaSync, FaEye, FaPlay, FaExclamationCircle } from 'react-icons/fa'
import { Upload } from '../types/upload'
import { usePolling } from '../hooks/usePolling'
import { ResultViewer } from './ResultViewer/ResultViewer'
import { api } from '../services/api'
import { AlignmentMethod } from '../types/common'
import { Analysis } from '../types/analysis'

export const AnalysisHistory = () => {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [isPollingEnabled, setIsPollingEnabled] = useState(true)
  const toast = useToast()
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [selectedError, setSelectedError] = useState<string | null>(null)

  const fetchUploads = async () => {
    try {
      const data = await api.getUploads();
      const sortedData = data.sort((a: Upload, b: Upload) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setUploads(sortedData);
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

  const getPollingInterval = useCallback(() => {
    const hasStartedAnalysis = uploads.some(upload => 
      upload.analyses?.some(analysis => 
        analysis.status === 'STARTED'
      )
    );
    
    const hasPendingAnalysis = uploads.some(upload => 
      upload.analyses?.some(analysis => 
        analysis.status === 'PENDING'
      )
    );

    if (hasStartedAnalysis) {
      return 10000; // 분석 진행 중: 10초
    } else if (hasPendingAnalysis) {
      return 15000; // 대기 중: 15초
    }
    return 30000; // 기본: 30초
  }, [uploads]);

  usePolling(fetchUploads, getPollingInterval(), {
    onError: handleError,
    enabled: isPollingEnabled && (
      uploads.some(upload => 
        upload.analyses?.some(analysis => 
          ['PENDING', 'STARTED'].includes(analysis.status)
        )
      )
    )
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
      await fetchUploads();
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

  const handleViewResult = (analysis: Analysis) => {
    if (!analysis.result_file) return;

    setSelectedAnalysis(analysis);
    setIsResultModalOpen(true);
  };

  const ErrorModal = ({ isOpen, onClose, error }: { isOpen: boolean; onClose: () => void; error: string }) => (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="red.500">Error Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Box
            bg="gray.50"
            p={4}
            borderRadius="md"
            fontFamily="monospace"
            whiteSpace="pre-wrap"
            overflowX="auto"
          >
            {error}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  return (
    <Card variant="outline" w="full" mt={8} id="analysis-history">
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
              {uploads
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((upload) => (
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
                                handleViewResult(mafftAnalysis);
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
                        <Button
                        leftIcon={<FaPlay />}
                        size="sm"
                        onClick={() => runAnalysis(upload.id, 'mafft')}
                      >
                        실행
                      </Button>
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
                                handleViewResult(uclustAnalysis);
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
                          <IconButton
                        aria-label="Show error"
                            icon={<FaExclamationCircle />}
                            size="xs"
                            colorScheme="red"
                            onClick={() => {
                              setSelectedError(upload.analyses?.find(a => a.method === 'uclust')?.error || 'No error details available');
                              setErrorModalOpen(true);
                            }}
                          />
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

      {isResultModalOpen && selectedAnalysis && (
        <ResultViewer
          filePath={selectedAnalysis.result_file!}
          isOpen={isResultModalOpen}
          onClose={() => {
            setIsResultModalOpen(false);
            setSelectedAnalysis(null);
          }}
          defaultTab={selectedAnalysis.method === 'mafft' ? 0 : 1}
          availableMethods={{
            mafft: uploads.some(upload => 
              upload.analyses.some(a => 
                a.method === 'mafft' && 
                a.status === 'SUCCESS' && 
                a.result_file === selectedAnalysis.result_file?.replace(/_[^_]+_result\.fasta$/, '_mafft_result.fasta')
              )
            ),
            uclust: uploads.some(upload => 
              upload.analyses.some(a => 
                a.method === 'uclust' && 
                a.status === 'SUCCESS' && 
                a.result_file === selectedAnalysis.result_file?.replace(/_[^_]+_result\.fasta$/, '_uclust_result.fasta')
              )
            )
          }}
          bluebaseResult={selectedAnalysis.bluebase_result}
          originalMethod={selectedAnalysis.method as 'mafft' | 'uclust'}
        />
      )}

      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => {
          setErrorModalOpen(false);
          setSelectedError(null);
        }}
        error={selectedError || ''}
      />
    </Card>
  )
} 