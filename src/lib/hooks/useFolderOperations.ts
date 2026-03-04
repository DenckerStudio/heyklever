"use client"

import { useState } from "react"

export interface FolderOperation {
  type: 'create' | 'rename' | 'delete'
  currentName?: string
  onSubmit: (name: string) => void
}

export function useFolderOperations() {
  const [operation, setOperation] = useState<FolderOperation | null>(null)
  const [inputValue, setInputValue] = useState("")

  const startCreateFolder = (onSubmit: (name: string) => void) => {
    setOperation({ type: 'create', onSubmit })
    setInputValue("")
  }

  const startRename = (currentName: string, onSubmit: (name: string) => void) => {
    setOperation({ type: 'rename', currentName, onSubmit })
    setInputValue(currentName)
  }

  const startDelete = (itemName: string, onSubmit: (name: string) => void) => {
    console.log('startDelete called with:', itemName);
    setOperation({ type: 'delete', currentName: itemName, onSubmit })
    setInputValue("")
    console.log('Operation set to delete for:', itemName);
  }

  const handleSubmit = () => {
    console.log('handleSubmit called, operation:', operation);
    if (operation) {
      if (operation.type === 'delete') {
        console.log('Calling delete onSubmit');
        operation.onSubmit("")
      } else if (inputValue.trim()) {
        operation.onSubmit(inputValue.trim())
      }
      setOperation(null)
      setInputValue("")
    }
  }

  const handleCancel = () => {
    setOperation(null)
    setInputValue("")
  }

  return {
    operation,
    inputValue,
    setInputValue,
    startCreateFolder,
    startRename,
    startDelete,
    handleSubmit,
    handleCancel,
  }
}
