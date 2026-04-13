"use client"

import { useCallback, useState } from "react"
import type * as T from "../types"
import type { UseKitteActionResult } from "./types"

export function useKitteAction<
  const TArgs extends readonly unknown[] = [],
  TOutput = unknown,
>(
  action: (...args: TArgs) => Promise<T.ActionResult<TOutput>>,
  options?: {
    onSuccess?: (data: TOutput) => void
    onError?: (error: T.PossibleError) => void
  },
): UseKitteActionResult<TArgs, TOutput> {
  const [state, setState] = useState<T.UseKitteActionState<TOutput>>({
    status: "idle",
    data: null,
    error: null,
  })

  const execute = useCallback(
    async (...args: TArgs) => {
      setState((prev) => ({
        status: "loading",
        data: prev.status === "idle" ? null : prev.data,
        error: null,
      }))
      const [_res, _err] = await action(...args)
      if (_err) {
        setState((prev) => ({
          status: "error",
          data: prev.data,
          error: _err,
        }))
        if (options?.onError) options.onError(_err)
      } else {
        setState({
          status: "success",
          data: _res,
          error: null,
        })
        if (options?.onSuccess) options.onSuccess(_res)
      }
      return [_res, _err] as T.ActionResult<TOutput>
    },
    [action, options],
  )

  return {
    ...state,
    execute,
  }
}
