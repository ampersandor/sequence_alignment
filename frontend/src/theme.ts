import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#2C3E50',
      }
    }
  },
  colors: {
    brand: {
      primary: '#2C3E50',
      primaryLight: '#34495E',
      secondary: '#ECF0F1',
      light: '#ECF0F1',
      neutral: '#3482AA',
      neutralLight: '#58A4B0',
      bg: '#2C3E50'
    }
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'lg',
      },
      variants: {
        primary: {
          bg: '#BAE8E8',
          color: '#2C3E50',
          _hover: {
            bg: '#a5d4d4',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          },
          _active: {
            transform: 'translateY(0)',
          },
          transition: 'all 0.2s',
        },
        secondary: {
          bg: '#ECF0F1',
          color: '#2C3E50',
          _hover: {
            bg: '#cce2e1',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          },
          _active: {
            transform: 'translateY(0)',
          },
          transition: 'all 0.2s',
        }
      }
    },
    Card: {
      baseStyle: {
        container: {
          bg: '#FFFFFF',
          borderRadius: 'xl',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s',
          _hover: {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }
        }
      }
    },
    Heading: {
      baseStyle: {
        letterSpacing: 'tight',
        color: '#FFFFFF'
      }
    },
    Text: {
      baseStyle: {
        color: '#ECF0F1'
      }
    }
  }
})

export default theme 