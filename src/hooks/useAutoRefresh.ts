import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef } from 'react';

/**
 * Calls `load` when the screen gains focus and then every `intervalMs` while it
 * stays focused. This is how statuses stay "live" without WebSockets.
 */
export function useAutoRefresh(load: () => void | Promise<void>, intervalMs = 15000) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      loadRef.current();
      const id = setInterval(() => loadRef.current(), intervalMs);
      return () => clearInterval(id);
    }, [intervalMs]),
  );
}
