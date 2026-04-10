import type { ZodTypeAny, z } from "zod"
import { parseObject } from "./helpers"
import type { ActionResult, Params, PossibleError } from "./types"

type InternalMiddleware = (data: {
  input: unknown
  ctx: Record<string, unknown>
}) => Promise<{ ctx: Record<string, unknown> }>

export class Kitte<
  TSchema extends ZodTypeAny | null = null,
  TCtx extends Record<string, unknown> = Record<string, unknown>,
> {
  private _middlewares: InternalMiddleware[] = []
  private _schema?: TSchema

  schema<TNewSchema extends ZodTypeAny>(
    schema: TNewSchema,
  ): Kitte<TNewSchema, TCtx> {
    this._middlewares = [...this._middlewares]
    this._schema = schema as unknown as TSchema
    return this as unknown as Kitte<TNewSchema, TCtx>
  }

  middleware<TNewCtx extends Record<string, unknown>>(
    fn: (data: {
      input: Record<string, unknown>
      ctx: Record<string, unknown>
    }) => Promise<TNewCtx> | TNewCtx,
  ): (data: {
    input: Record<string, unknown>
    ctx: Record<string, unknown>
  }) => Promise<{ ctx: TNewCtx }> {
    return async (data) => {
      const result = await fn(data)
      return { ctx: result }
    }
  }

  use<TNewCtx extends Record<string, unknown>>(
    fn: (data: Params<TSchema, TCtx>) => Promise<{ ctx: TNewCtx }>,
  ): Kitte<TSchema, TCtx & TNewCtx> {
    this._middlewares.push(fn as InternalMiddleware)
    return this as unknown as Kitte<TSchema, TCtx & TNewCtx>
  }

  action<TOutput>(
    fn: (data: Params<TSchema, TCtx>) => Promise<TOutput> | TOutput,
  ) {
    return async (
      ...args: TSchema extends ZodTypeAny ? [input: z.infer<TSchema>] : []
    ): Promise<ActionResult<TOutput>> => {
      try {
        const input = args[0]

        const parsed = this._schema ? this._schema.parse(input) : input

        let ctx = {} as TCtx

        for (const middleware of this._middlewares) {
          const result = await middleware({
            input: parsed,
            ctx,
          })

          ctx = { ...ctx, ...result.ctx } as TCtx
        }

        const result = await fn({
          input: parsed,
          ctx,
        } as Params<TSchema, TCtx>)

        return [parseObject(result), null]
      } catch (error) {
        return [null, error as PossibleError]
      }
    }
  }
}
