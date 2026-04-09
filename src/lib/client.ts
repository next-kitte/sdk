"use client"

import { useCallback, useState } from "react"
import type { ActionResult, PossibleError } from "./types"

export function useKitteAction<TInput, TOutput>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options?: {
    onSuccess?: (data: TOutput) => void
    onError?: (error: PossibleError) => void
  },
) {
  const [data, setData] = useState<TOutput | null>(null)
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [error, setError] = useState<unknown | null>(null)

  const execute = useCallback(
    async (input: TInput) => {
      setStatus("loading")
      const [_res, _err] = await action(input)
      if (_err) {
        setError(_err)
        setStatus("error")
        if (options?.onError) {
          options.onError(_err)
        }
      }
      if (_res) {
        setData(_res)
        setStatus("success")
        if (options?.onSuccess) {
          options.onSuccess(_res)
        }
      }
      return [_res, _err] as ActionResult<TOutput>
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
