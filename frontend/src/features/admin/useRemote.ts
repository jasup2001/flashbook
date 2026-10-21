import { useCallback, useEffect, useState } from 'react';
import { message } from './api';

export function useRemote<T>(loader: () => Promise<T>, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let current = true;
    setError('');
    loader().then(value => { if (current) setData(value); }).catch(reason => { if (current) setError(message(reason)); });
    return () => { current = false; };
  }, [loader, version]);
  useEffect(() => {
    if (!refreshMs) return;
    const timer = window.setInterval(reload, refreshMs);
    return () => clearInterval(timer);
  }, [reload, refreshMs]);
  return { data, error, reload };
}
