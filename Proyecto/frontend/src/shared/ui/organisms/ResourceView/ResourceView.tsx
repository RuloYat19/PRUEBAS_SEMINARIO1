import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/atoms'
import { Alert } from '@/shared/ui/molecules'
import type { ResourceStatus } from '@/shared/lib'

export interface ResourceViewProps {
  status: ResourceStatus
  error: string | null
  onRetry: () => void
  isEmpty: boolean
  skeleton: ReactNode
  empty: ReactNode
  children: ReactNode
}

export function ResourceView({ status, error, onRetry, isEmpty, skeleton, empty, children }: ResourceViewProps) {
  if (status === 'loading') return <div aria-busy="true">{skeleton}</div>

  if (status === 'error') {
    return (
      <div className="tf-stack">
        <Alert tone="danger" title="No pudimos cargar la información">
          {error}
        </Alert>
        <div>
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return <>{isEmpty ? empty : children}</>
}
