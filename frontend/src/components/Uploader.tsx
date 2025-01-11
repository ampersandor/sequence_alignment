import { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Text,
  VStack,
  HStack,
  useToast,
} from '@chakra-ui/react'
import { FaUpload, FaFile, FaPlus } from 'react-icons/fa'
import { api } from '../services/api'

export const Uploader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const toast = useToast()



  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadId(null)
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
      toast({
        title: '작업 생성 중 오류가 발생했습니다.',
        description: error instanceof Error ? error.message : '이런... 왜 이럴 까요? 문의 주세요! 안주셔도 되구요!',
        status: 'error',
        duration: 3000,
      });
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