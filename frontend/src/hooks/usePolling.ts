import { useEffect, useCallback, useRef } from 'react'

interface PollingOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
}

export const usePolling = (
  callback: () => Promise<void>,
  interval: number,
  options: PollingOptions = {}
) => {
  const{ enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
       await callback();
       options.onSuccess?.();
      } catch (error) {
        options.onError?.(error);
      }
    };

    // 초기 실행
    poll();

    const intervalId = setInterval(poll, interval);
    return () => clearInterval(intervalId);
  }, [callback, interval, options.onError, enabled]);
};