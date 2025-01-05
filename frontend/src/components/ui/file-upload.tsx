"use client"

import {
  Button,
  Icon,
  IconButton,
  Text,
  Box,
  VStack,
} from "@chakra-ui/react"
import * as React from "react"
import { LuFile, LuUpload, LuX } from "react-icons/lu"

interface FileUploadRootProps {
  accept?: string[]
  maxFiles?: number
  onFileChange?: (details: { acceptedFiles: File[] }) => void
  children?: React.ReactNode
}

export const FileUploadRoot = ({ children, ...props }: FileUploadRootProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    props.onFileChange?.({ acceptedFiles: files })
  }

  return (
    <Box>
      <input
        type="file"
        onChange={handleChange}
        accept={props.accept?.join(',')}
        multiple={props.maxFiles !== 1}
        style={{ display: 'none' }}
        id="file-upload"
      />
      {children}
    </Box>
  )
}

export const FileUploadTrigger = ({ 
  children, 
  asChild,
  ...props 
}: { 
  children: React.ReactNode;
  asChild?: boolean;
}) => {
  return (
    <label htmlFor="file-upload" {...props}>
      {children}
    </label>
  )
}

export const FileUploadList = () => null
