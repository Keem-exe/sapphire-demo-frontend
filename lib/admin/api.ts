import { API_URL } from "@/lib/api-config"

/**
 * Admin API client. Uses its own token storage (adminToken / adminRefreshToken)
 * so it never interferes with the student app's session.
 */
const BASE = API_URL

export const ADMIN_KEYS = { token: "adminToken", refresh: "adminRefreshToken", user: "adminUser" } as const
export const UNAUTHORIZED_EVENT = "admin:unauthorized"

export interface Envelope<T = any> {
  success: boolean
  message?: string
  data: T
  errors?: Record<string, string[]>
}

export interface Pagination {
  page: number
  perPage: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrev: boolean
}

export interface Page<T> {
  items: T[]
  pagination: Pagination
}

export class AdminApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

const store = {
  get: (k: string) => (typeof window === "undefined" ? null : localStorage.getItem(k)),
  set: (k: string, v: string) => localStorage.setItem(k, v),
  clear: () => Object.values(ADMIN_KEYS).forEach((k) => localStorage.removeItem(k)),
}

export const adminSession = {
  save(token: string, refreshToken: string | undefined, user: unknown) {
    store.set(ADMIN_KEYS.token, token)
    if (refreshToken) store.set(ADMIN_KEYS.refresh, refreshToken)
    store.set(ADMIN_KEYS.user, JSON.stringify(user))
  },
  clear: store.clear,
  token: () => store.get(ADMIN_KEYS.token),
}

let refreshing: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const refresh = store.get(ADMIN_KEYS.refresh)
    if (!refresh) return false
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${refresh}` },
      })
      if (!res.ok) return false
      const body = await res.json()
      const token = body?.data?.token
      if (!token) return false
      store.set(ADMIN_KEYS.token, token)
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

interface RequestOptions {
  params?: Params
  body?: unknown
  /** false for login: a 401 there is a credentials error, not an expired session */
  auth?: boolean
  bearer?: string
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}, retried = false): Promise<Envelope<T>> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(opts.params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v))
  })

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = opts.bearer ?? (opts.auth === false ? null : store.get(ADMIN_KEYS.token))
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })
  } catch {
    throw new AdminApiError(`Cannot reach the backend at ${BASE}.`, 0)
  }

  if (res.status === 401 && opts.auth !== false && !opts.bearer) {
    if (!retried && (await refreshAccessToken())) return request<T>(method, path, opts, true)
    store.clear()
    if (typeof window !== "undefined") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new AdminApiError(body?.message || body?.error || `Request failed (${res.status})`, res.status, body?.errors)
  }
  return body as Envelope<T>
}

export const api = {
  /** GET, unwrapped to `data` */
  get: async <T>(path: string, params?: Params) => (await request<T>("GET", path, { params })).data,
  post: <T = any>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T = any>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  del: <T = any>(path: string) => request<T>("DELETE", path),
  login: (email: string, password: string) =>
    request<{ token: string; refreshToken?: string; user: any }>("POST", "/api/auth/login", {
      body: { email, password },
      auth: false,
    }),
  logout: (bearer?: string) => request("POST", "/api/auth/logout", { bearer }).catch(() => undefined),
}
