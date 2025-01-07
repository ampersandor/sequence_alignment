import { useEffect, useCallback, useRef } from 'react'

export const usePolling = (
  callback: () => Promise<void>,
  interval: number,
  enabled: boolean = true
) => {
  const savedCallback = useRef(callback)

  // callback이 변경될 때마다 ref 업데이트
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    // 첫 실행
    savedCallback.current()

    const intervalId = setInterval(() => {
      savedCallback.current()
    }, interval)

    // cleanup function
    return () => {
      clearInterval(intervalId)
    }
  }, [interval, enabled]) // callback 제거, interval과 enabled만 의존성으로 사용
} 