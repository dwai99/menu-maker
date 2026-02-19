import { useState, useEffect, useRef } from 'react'

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay of inactivity.
 *
 * Used in PagePreview to prevent re-rendering the expensive preview
 * component on every keystroke when editing menu item names,
 * descriptions, or prices. The preview will instead update 150ms
 * after the user stops typing.
 */
export function useDebouncedValue<T>(value: T, delay: number = 150): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay])

  return debouncedValue
}
