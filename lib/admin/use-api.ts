"use client"

import { useEffect, useState } from "react"
import { api } from "./api"

// Any successful mutation calls invalidate(), which refetches every mounted query.
const listeners = new Set<() => void>()
export const invalidate = () => listeners.forEach((l) => l())

type Params = Record<string, string | number | boolean | undefined | null>

export function useApi<T>(path: string | null, params?: Params, opts: { refreshMs?: number } = {}) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path })
  const [tick, setTick] = useState(0)
  const key = path ? `${path}?${JSON.stringify(params ?? {})}` : null

  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  useEffect(() => {
    if (!opts.refreshMs) return
    const id = setInterval(() => setTick((t) => t + 1), opts.refreshMs)
    return () => clearInterval(id)
  }, [opts.refreshMs])

  useEffect(() => {
    if (!path) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    api
      .get<T>(path, params)
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((e) => !cancelled && setState((s) => ({ ...s, error: e.message, loading: false })))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  return { ...state, refetch: () => setTick((t) => t + 1) }
}
