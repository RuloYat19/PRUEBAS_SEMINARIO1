export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function messageFor(error: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.') {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback
  return fallback
}
