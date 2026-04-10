"use client"

import { useCallback, useState } from "react"
import type * as T from "../types"

export function useKitteAction<
  const TArgs extends readonly unknown[] = [],
  TOutput = unknown,
>(
  action: (...args: TArgs) => Promise<T.ActionResult<TOutput>>,
  options?: {
    onSuccess?: (data: TOutput) => void
    onError?: (error: T.PossibleError) => void
  },
) {
  const [data, setData] = useState<TOutput | null>(null)
  const [status, setStatus] = useState<T.Status>("idle")
  const [error, setError] = useState<unknown | null>(null)

  const execute = useCallback(
    async (...args: TArgs) => {
      setStatus("loading")
      const [_res, _err] = await action(...args)
      if (_err) {
        setError(_err)
        setStatus("error")
        if (options?.onError) options.onError(_err)
      }
      if (_res) {
        setData(_res)
        setStatus("success")
        if (options?.onSuccess) options.onSuccess(_res)
      }
      return [_res, _err] as T.ActionResult<TOutput>
    },
    [action, options],
  )

  return {
    data,
    status,
    error,
    execute,
  }
}
