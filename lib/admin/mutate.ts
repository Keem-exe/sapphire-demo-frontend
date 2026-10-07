import { toast } from "sonner"
import { AdminApiError, type Envelope } from "./api"
import { invalidate } from "./use-api"

export type MutateResult<T> = { ok: true; res: Envelope<T> } | { ok: false; error: AdminApiError }

/** Runs a mutation, toasts the outcome, and refetches all mounted queries on success. */
export async function mutate<T = any>(fn: () => Promise<Envelope<T>>, successFallback = "Done"): Promise<MutateResult<T>> {
  try {
    const res = await fn()
    toast.success(res.message || successFallback)
    invalidate()
    return { ok: true, res }
  } catch (e) {
    const error = e instanceof AdminApiError ? e : new AdminApiError((e as Error).message, 0)
    toast.error(error.message)
    return { ok: false, error }
  }
}

export function fieldError(error: AdminApiError | undefined, field: string): string | undefined {
  return error?.errors?.[field]?.join(", ")
}
