import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { AlignmentTool } from '@/components/AlignmentTool'

export const Home = () => {
  return (
    <Box>
      {/* Hero Section */}
      <Box
        bgGradient="brand.primary"
        pt={20}
        pb={32}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        <Container maxW="container.xl">
          <VStack spacing={8} textAlign="center">
            <Heading
              as="h1"
              size="2xl"
              color="brand.light"
              fontWeight="bold"
            >
              MAFFT & UCLUST
            </Heading>
            <Text
              fontSize="xl"
              color="brand.secondary"
              maxW="3xl"
            >
              for AutoMSA
            </Text>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW="container.xl" mt={-20} mb={16}>
        {/* Tool Section */}
        <Box 
          w="full" 
          maxW="container.xl" 
          mx="auto"
          bg="brand.light"
          p={8}
          borderRadius="2xl"
          boxShadow="xl"
        >
          <AlignmentTool />
        </Box>
      </Container>
    </Box>
  )
} 