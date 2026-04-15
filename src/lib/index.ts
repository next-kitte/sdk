import { parseObject } from "./helpers"
import type * as T from "./types"

function makePipelineBuilder<
  TInput,
  TOutput,
  TMiddlewares extends Record<string, unknown>[],
>(
  state: T.BuilderState<TInput, TOutput>,
): T.PipelineBuilder<TInput, TOutput, TMiddlewares> {
  return {
    input<TNewInput>(schema: T.Schema<TNewInput>) {
      return makePipelineBuilder<TNewInput, TOutput, TMiddlewares>({
        ...(state as unknown as T.BuilderState<TNewInput, TOutput>),
        inputSchema: schema,
      })
    },

    output<TNewOutput>(schema: T.Schema<TNewOutput>) {
      return makePipelineBuilder<TInput, TNewOutput, TMiddlewares>({
        ...(state as unknown as T.BuilderState<TInput, TNewOutput>),
        outputSchema: schema,
      })
    },

    use<TNewContext extends Record<string, unknown>>(
      middleware: T.Middleware<TNewContext>,
    ) {
      return makePipelineBuilder<
        TInput,
        TOutput,
        [...TMiddlewares, TNewContext]
      >({
        ...state,
        middlewares: [
          ...state.middlewares,
          middleware as T.Middleware<Record<string, unknown>>,
        ],
      } as T.BuilderState<TInput, TOutput>)
    },

    onSuccess(cb) {
      return makePipelineBuilder<TInput, TOutput, TMiddlewares>({
        ...state,
        onSuccessCallbacks: [...state.onSuccessCallbacks, cb],
      })
    },

    onError(cb) {
      return makePipelineBuilder<TInput, TOutput, TMiddlewares>({
        ...state,
        onErrorCallbacks: [...state.onErrorCallbacks, cb],
      })
    },

    onStart(cb) {
      return makePipelineBuilder<TInput, TOutput, TMiddlewares>({
        ...state,
        onStartCallbacks: [...state.onStartCallbacks, cb],
      })
    },

    action: ((
      fn: (args: {
        input: TInput
        ctx: T.MergeObjects<TMiddlewares>
      }) => T.MaybePromise<unknown>,
    ) => {
      // Snapshot state at the moment .action() is called.
      // All callbacks must be registered before .action().
      const frozen = state

      return async (
        rawInput?: TInput,
      ): Promise<[unknown, null] | [null, Error]> => {
        for (const cb of frozen.onStartCallbacks) {
          await cb()
        }

        try {
          const input: TInput = frozen.inputSchema
            ? frozen.inputSchema.parse(rawInput)
            : (rawInput as TInput)

          const ctx: Record<string, unknown> = {}
          for (const mw of frozen.middlewares) {
            const result = await mw.execute()
            Object.assign(ctx, result)
          }

          const rawOutput = await (
            fn as (args: {
              input: TInput
              ctx: Record<string, unknown>
            }) => T.MaybePromise<unknown>
          )({ input, ctx })

          const output = frozen.outputSchema
            ? frozen.outputSchema.parse(rawOutput)
            : rawOutput

          for (const cb of frozen.onSuccessCallbacks) {
            await cb(output as T.PipelineSuccessData<TOutput>)
          }

          return [parseObject(output), null]
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))

          // Run onError callbacks, but do NOT re-throw —
          // let the caller decide what to do with the error.
          // If no onError handler is registered the error surfaces normally.
          if (frozen.onErrorCallbacks.length > 0) {
            for (const cb of frozen.onErrorCallbacks) {
              await cb(err)
            }
          }

          return [null, err]
        }
      }
    }) as T.PipelineBuilder<TInput, TOutput, TMiddlewares>["action"],
  }
}

// ─── Middleware factory ───────────────────────────────────────────────────────
export function createMiddleware<TContext extends Record<string, unknown>>(
  fn: T.MiddlewareFn<TContext>,
): T.Middleware<TContext> {
  return {
    _contextType: undefined as unknown as TContext,
    execute: fn,
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

function makeInitialState(): T.BuilderState<undefined, T.InferActionOutput> {
  return {
    inputSchema: null,
    outputSchema: null,
    middlewares: [],
    onSuccessCallbacks: [],
    onErrorCallbacks: [],
    onStartCallbacks: [],
  }
}

export type KitteClient = {
  middleware: <TContext extends Record<string, unknown>>(
    fn: T.MiddlewareFn<TContext>,
  ) => T.Middleware<TContext>
  input: <TInput>(
    schema: T.Schema<TInput>,
  ) => T.PipelineBuilder<TInput, T.InferActionOutput, []>
  output: <TOutput>(
    schema: T.Schema<TOutput>,
  ) => T.PipelineBuilder<undefined, TOutput, []>
  use: <TContext extends Record<string, unknown>>(
    middleware: T.Middleware<TContext>,
  ) => T.PipelineBuilder<undefined, T.InferActionOutput, [TContext]>
  onSuccess: (
    cb: (data: unknown) => T.MaybePromise<void>,
  ) => T.PipelineBuilder<undefined, T.InferActionOutput, []>
  onError: (
    cb: (error: unknown) => T.MaybePromise<void>,
  ) => T.PipelineBuilder<undefined, T.InferActionOutput, []>
  onStart: (
    cb: () => T.MaybePromise<void>,
  ) => T.PipelineBuilder<undefined, T.InferActionOutput, []>
  action: <TInferred>(
    fn: (args: {
      input: undefined
      ctx: Record<string, unknown>
    }) => T.MaybePromise<TInferred>,
  ) => T.ServerAction<undefined, TInferred>
}

export function createKitte(): KitteClient {
  const base = () =>
    makePipelineBuilder<undefined, T.InferActionOutput, []>(makeInitialState())

  return {
    middleware: createMiddleware,
    input: (schema) => base().input(schema),
    output: (schema) => base().output(schema),
    use: (middleware) => base().use(middleware),
    onSuccess: (cb) => base().onSuccess(cb),
    onError: (cb) => base().onError(cb),
    onStart: (cb) => base().onStart(cb),
    action: (fn) => base().action(fn),
  }
}
