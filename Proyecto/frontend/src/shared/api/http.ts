import { ApiError } from './ApiError'
import { API_URL } from './config'

const NETWORK_ERROR = 'No se pudo contactar al servidor. Revisa tu conexión e inténtalo de nuevo.'

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function extractMessage(body: unknown): string | null {
  if (typeof body === 'string') return body || null
  if (!body || typeof body !== 'object') return null
  const { error, message } = body as Record<string, unknown>
  for (const candidate of [error, message]) {
    if (typeof candidate === 'string' && candidate) return candidate
  }
  return null
}

async function readError(response: Response) {
  try {
    return extractMessage(await response.json()) ?? response.statusText
  } catch {
    return response.statusText || `Error ${response.status}`
  }
}

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const toBackend = url.startsWith(API_URL)
  if (authToken && toBackend) headers.set('Authorization', `Bearer ${authToken}`)
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch {
    throw new ApiError(0, NETWORK_ERROR)
  }

  if (response.status === 401 && authToken && toBackend) onUnauthorized?.()
  if (!response.ok) throw new ApiError(response.status, await readError(response))
  if (response.status === 204) return undefined as T

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function api(path: string) {
  return `${API_URL}${path}`
}
