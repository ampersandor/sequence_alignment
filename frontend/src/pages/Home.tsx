import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AlignmentTool } from '../components/AlignmentTool'
import { AnalysisHistory } from '../components/AnalysisHistory'

export const Home = () => {
  return (
    <Box w="full" minH="100vh" bg="gray.50">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Heading size="2xl" color="brand.primary" mb={4}>
              Sequence Alignment Tool
            </Heading>
            <Text fontSize="lg" color="gray.600">
              using MAFFT and UCLUST
            </Text>
          </Box>
          
          <AlignmentTool />
          <AnalysisHistory />
        </VStack>
      </Container>
    </Box>
  )
} 