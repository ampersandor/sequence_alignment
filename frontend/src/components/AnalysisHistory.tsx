import { useEffect, useState } from 'react'
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
  Tooltip,
  Text,
  useToast,
  HStack,
} from '@chakra-ui/react'
import { FaDownload, FaInfoCircle, FaSync } from 'react-icons/fa'
import { Analysis } from '../types/analysis'
import { usePolling } from '@/hooks/usePolling'

interface AnalysisHistoryProps {
  apiUrl: string;
}

export const AnalysisHistory = ({ apiUrl }: AnalysisHistoryProps) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const toast = useToast()

  const fetchAnalyses = async () => {
    try {
      const response = await fetch(`${apiUrl}/analyses`)
      if (!response.ok) throw new Error('Failed to fetch analyses')
      const data = await response.json()
      setAnalyses(data)
    } catch (error) {
      console.error('Error fetching analyses:', error)
    }
  }

  // 3초마다 분석 기록 업데이트
  usePolling(fetchAnalyses, 3000)

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

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleTimeString('ko-KR')
  }

  const downloadResult = (filename: string) => {
    window.open(`${apiUrl}/results/${filename}`, '_blank')
  }

  return (
    <Card variant="outline" w="full" mt={8}>
      <CardHeader bg="brand.primary" py={4}>
        <HStack justify="space-between">
          <Heading size="md" color="brand.light">분석 기록</Heading>
          <IconButton
            aria-label="Refresh analyses"
            icon={<FaSync />}
            size="sm"
            colorScheme="whiteAlpha"
            onClick={() => fetchAnalyses()}
          />
        </HStack>
      </CardHeader>
      <CardBody p={0}>
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>파일명</Th>
                <Th>실행 시각</Th>
                <Th>방법</Th>
                <Th>상태</Th>
                <Th>실행 시간</Th>
                <Th>시퀀스 수</Th>
                <Th>평균 길이</Th>
                <Th>생성일</Th>
                <Th>액션</Th>
              </Tr>
            </Thead>
            <Tbody>
              {analyses.map((analysis) => (
                <Tr key={analysis.id}>
                  <Td>{analysis.input_file}</Td>
                  <Td>{analysis.extra_data?.timestamp ? formatTimestamp(analysis.extra_data.timestamp) : '-'}</Td>
                  <Td>{analysis.method.toUpperCase()}</Td>
                  <Td>{getStatusBadge(analysis.status)}</Td>
                  <Td>
                    {analysis.extra_data?.execution_metrics?.execution_time.toFixed(2)}초
                  </Td>
                  <Td>{analysis.extra_data?.execution_metrics?.sequence_count}</Td>
                  <Td>
                    {analysis.extra_data?.execution_metrics?.average_sequence_length.toFixed(1)}
                  </Td>
                  <Td>{formatDate(analysis.created_at)}</Td>
                  <Td>
                    <IconButton
                      aria-label="Download result"
                      icon={<FaDownload />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      isDisabled={!analysis.result_file}
                      onClick={() => analysis.result_file && downloadResult(analysis.result_file)}
                    />
                    {analysis.error && (
                      <Tooltip label={analysis.error}>
                        <IconButton
                          aria-label="Show error"
                          icon={<FaInfoCircle />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          ml={2}
                        />
                      </Tooltip>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {analyses.length === 0 && (
            <Text p={4} textAlign="center" color="gray.500">
              분석 기록이 없습니다.
            </Text>
          )}
        </Box>
      </CardBody>
    </Card>
  )
} 