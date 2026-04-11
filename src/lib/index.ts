import type { ZodTypeAny, z } from "zod"
import { parseObject } from "./helpers"
import type { ActionResult, Params, PossibleError } from "./types"

type InternalMiddleware = (data: {
  input: unknown
  ctx: Record<string, unknown>
}) => Promise<{ ctx: Record<string, unknown> }>

export type KitteBuilder<
  TSchema extends ZodTypeAny | null = null,
  TCtx extends Record<string, unknown> = Record<string, unknown>,
> = {
  schema<TNewSchema extends ZodTypeAny>(
    schema: TNewSchema,
  ): KitteBuilder<TNewSchema, TCtx>
  middleware<TNewCtx extends Record<string, unknown>>(
    fn: (data: Params<TSchema, TCtx>) => Promise<TNewCtx> | TNewCtx,
  ): (data: Params<TSchema, TCtx>) => Promise<{ ctx: TNewCtx }>
  use<TNewCtx extends Record<string, unknown>>(
    fn: (
      data: Params<TSchema, TCtx>,
    ) => Promise<{ ctx: TNewCtx }> | { ctx: TNewCtx },
  ): KitteBuilder<TSchema, TCtx & TNewCtx>
  action<TOutput>(
    fn: (data: Params<TSchema, TCtx>) => Promise<TOutput> | TOutput,
  ): (
    ...args: TSchema extends ZodTypeAny ? [input: z.infer<TSchema>] : []
  ) => Promise<ActionResult<TOutput>>
}

function makeKitte<
  TSchema extends ZodTypeAny | null,
  TCtx extends Record<string, unknown>,
>(
  middlewares: InternalMiddleware[],
  schema: TSchema | undefined,
): KitteBuilder<TSchema, TCtx> {
  return {
    schema<TNewSchema extends ZodTypeAny>(newSchema: TNewSchema) {
      return makeKitte<TNewSchema, TCtx>([...middlewares], newSchema)
    },

    middleware<TNewCtx extends Record<string, unknown>>(
      fn: (data: Params<TSchema, TCtx>) => Promise<TNewCtx> | TNewCtx,
    ): (data: Params<TSchema, TCtx>) => Promise<{ ctx: TNewCtx }> {
      return async (data) => {
        const result = await fn(data)
        return { ctx: result }
      }
    },

    use<TNewCtx extends Record<string, unknown>>(
      fn: (
        data: Params<TSchema, TCtx>,
      ) => Promise<{ ctx: TNewCtx }> | { ctx: TNewCtx },
    ): KitteBuilder<TSchema, TCtx & TNewCtx> {
      const wrapped: InternalMiddleware = async (data) => {
        const result = await fn(data as Params<TSchema, TCtx>)
        return { ctx: result.ctx as Record<string, unknown> }
      }
      return makeKitte<TSchema, TCtx & TNewCtx>(
        [...middlewares, wrapped],
        schema,
      ) as KitteBuilder<TSchema, TCtx & TNewCtx>
    },

    action<TOutput>(
      fn: (data: Params<TSchema, TCtx>) => Promise<TOutput> | TOutput,
    ) {
      return async (
        ...args: TSchema extends ZodTypeAny ? [input: z.infer<TSchema>] : []
      ): Promise<ActionResult<TOutput>> => {
        try {
          const input = args[0]

          const parsed = schema ? schema.parse(input) : input

          let ctx = {} as TCtx

          for (const middleware of middlewares) {
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
    },
  }
}

export function createKitte(): KitteBuilder<null, Record<string, unknown>> {
  return makeKitte<null, Record<string, unknown>>([], undefined)
}
