import { useCallback, useEffect, useState } from 'react'
import { messageFor } from '@/shared/api'

export type ResourceStatus = 'loading' | 'error' | 'ready'

export function useResource<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial)
  const [status, setStatus] = useState<ResourceStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    try {
      setData(await loader())
      setStatus('ready')
    } catch (err) {
      setError(messageFor(err))
      setStatus('error')
    }
  }, [loader])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, setData, status, error, reload }
}
