import { Box, HStack, Button } from '@chakra-ui/react'
import { FaDownload } from 'react-icons/fa'

interface DownloadButtonsProps {
  onDownload: () => Promise<void>;
  onBluebaseDownload: (type: 'alignment' | 'gap') => Promise<void>;
}

export const DownloadButtons = ({
  onDownload,
  onBluebaseDownload
}: DownloadButtonsProps) => (
  <Box w="full">
    <HStack justify="flex-end" w="full" p={4} bg="gray.50" spacing={4}>
      <Button
        size="sm"
        leftIcon={<FaDownload />}
        onClick={onDownload}
        variant="secondary"
      >
        정렬 결과
      </Button>
      <Button
        size="sm"
        leftIcon={<FaDownload />}
        onClick={() => onBluebaseDownload('alignment')}
        variant="secondary"
      >
        Alignment Stats
      </Button>
      <Button
        size="sm"
        leftIcon={<FaDownload />}
        onClick={() => onBluebaseDownload('gap')}
        variant="secondary"
      >
        Gap Stats
      </Button>
    </HStack>
  </Box>
);
