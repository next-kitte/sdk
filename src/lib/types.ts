import type { ZodError, ZodTypeAny, z } from "zod"

export type PossibleError = Error | ZodError

export type Params<Schema, TCtx = Record<string, unknown>> = {
  input: Schema extends ZodTypeAny ? z.infer<Schema> : never
  ctx: TCtx
}

export type ActionResult<T> = [T, null] | [null, PossibleError]
