import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AlignmentTool } from '../components/AlignmentTool'
import { AnalysisHistory } from '../components/AnalysisHistory'

const API_URL = import.meta.env.VITE_API_URL

export const Home = () => {
  return (
    <Box w="full" minH="100vh" bg="gray.50">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Heading size="2xl" color="brand.primary" mb={4}>
              시퀀스 정렬 도구
            </Heading>
            <Text fontSize="lg" color="gray.600">
              MAFFT와 UCLUST를 사용한 시퀀스 정렬 분석
            </Text>
          </Box>
          
          <AlignmentTool />
          <AnalysisHistory apiUrl={API_URL} />
        </VStack>
      </Container>
    </Box>
  )
} 