import { useEffect, useState } from 'react'

// Like useState, but persisted to localStorage under a namespaced key so tool
// settings survive a refresh. Fixes the old app's "a reload wipes everything".
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const storageKey = `pixelforge:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [storageKey, value])
  return [value, setValue]
}
