import { useEffect, useRef } from 'react'

interface PollingOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
  immediate?: boolean;
}

export const usePolling = (
  callback: () => Promise<void>,
  interval: number,
  options: PollingOptions = {}
) => {
  const { enabled = true, immediate = true } = options;
  const intervalRef = useRef<number>();

  useEffect(() => {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed || !enabled) return;

      try {
        await callback();
        options.onSuccess?.();
      } catch (error) {
        options.onError?.(error);
      }
    };

    // 초기 실행
    if (immediate && enabled) {
      poll();
    }

    // 주기적 실행 설정
    if (enabled) {
      intervalRef.current = window.setInterval(poll, interval);
    }

    // cleanup
    return () => {
      isSubscribed = false;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [callback, interval, enabled, immediate]);
};