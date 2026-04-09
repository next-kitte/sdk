import type { ZodTypeAny, z } from "zod"
import { parseObject } from "./helpers"
import type { ActionResult, Params, PossibleError } from "./types"

export class Kitte<
  TSchema extends ZodTypeAny | null = null,
  TCtx extends Record<string, unknown> = Record<string, unknown>,
> {
  private _middlewares: Array<
    (data: Params<TSchema, TCtx>) => Promise<{ ctx: Partial<TCtx> }>
  > = []

  constructor(private _schema?: TSchema) {}

  schema<TNewSchema extends ZodTypeAny>(schema: TNewSchema) {
    const client = new Kitte<TNewSchema, TCtx>(schema)
    client._middlewares = this._middlewares as unknown as Kitte<
      TNewSchema,
      TCtx
    >["_middlewares"]
    return client
  }

  middleware<TNewCtx extends Record<string, unknown>>(
    fn: (data: {
      input: Record<string, unknown>
      ctx: Record<string, unknown>
    }) => Promise<TNewCtx> | TNewCtx,
  ) {
    return async (data: {
      input: Record<string, unknown>
      ctx: Record<string, unknown>
    }) => {
      const result = await fn(data)
      return {
        ctx: result,
      }
    }
  }

  use<TNewCtx extends Record<string, unknown>>(
    fn: (data: Params<TSchema, TCtx>) => Promise<{ ctx: TNewCtx }>,
  ): Kitte<TSchema, TCtx & TNewCtx> {
    // biome-ignore lint/suspicious/noExplicitAny: middlewares can be a infinity of types
    const newMiddlewares: any[] = [...this._middlewares, fn]
    const client = new Kitte<TSchema, TCtx & TNewCtx>(this._schema)
    client._middlewares = newMiddlewares
    return client
  }

  action<TOutput>(fn: (data: Params<TSchema, TCtx>) => Promise<TOutput>) {
    return async (
      ...args: TSchema extends ZodTypeAny
        ? [input: z.infer<TSchema>]
        : [input?: unknown]
    ): Promise<ActionResult<TOutput>> => {
      try {
        const input = args[0]

        const parsed = this._schema ? this._schema.parse(input) : input

        let ctx = {} as TCtx

        for (const middleware of this._middlewares) {
          const result = await middleware({
            input: parsed,
            ctx,
          } as Params<TSchema, TCtx>)

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
