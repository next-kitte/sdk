import type * as T from "../types"

export type UseKitteActionResult<
  TArgs extends readonly unknown[],
  TOutput,
> = T.UseKitteActionState<TOutput> & {
  execute: (...args: TArgs) => Promise<T.ActionResult<TOutput>>
  reset: () => void
}
