export type Status = "idle" | "loading" | "success" | "error"

export type UseKitteActionState<TOutput> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: TOutput | null; error: null }
  | { status: "success"; data: TOutput; error: null }
  | { status: "error"; data: TOutput | null; error: Error }

export type ActionResult<TOutput> = [TOutput, null] | [null, Error]

export type PossibleError = Error | null

export type MaybePromise<T> = T | Promise<T>

// ─── Schema type (compatible with Zod, Valibot, Arktype, etc.) ───────────
export type Schema<TOutput> = {
  parse(data: unknown): TOutput
}

/** Pipeline has no `.output()` — `.action()` return type is inferred from the handler. */
declare const inferActionOutput: unique symbol
export type InferActionOutput = typeof inferActionOutput

export type PipelineSuccessData<TOutput> = [TOutput] extends [InferActionOutput]
  ? unknown
  : TOutput

// ─── Middleware ───────────────────────────────────────────────────────────────

export type MiddlewareFn<TContext extends Record<string, unknown>> =
  () => MaybePromise<TContext>

export type Middleware<TContext extends Record<string, unknown>> = {
  readonly _contextType: TContext
  readonly execute: MiddlewareFn<TContext>
}

// ─── Merge tuple of records into one ─────────────────────────────────────────
export type MergeObjects<T extends Record<string, unknown>[]> = T extends [
  infer Head extends Record<string, unknown>,
  ...infer Tail extends Record<string, unknown>[],
]
  ? Head & MergeObjects<Tail>
  : Record<string, unknown>

// ─── Internal state ───────────────────────────────────────────────────────────
export type BuilderState<TInput, TOutput> = {
  inputSchema: Schema<TInput> | null
  outputSchema: Schema<TOutput> | null
  middlewares: Middleware<Record<string, unknown>>[]
  onSuccessCallbacks: Array<
    (data: PipelineSuccessData<TOutput>) => MaybePromise<void>
  >
  onErrorCallbacks: Array<(error: unknown) => MaybePromise<void>>
  onStartCallbacks: Array<() => MaybePromise<void>>
}

export type ServerAction<TInput, TOutput> = [TInput] extends [undefined]
  ? () => Promise<[TOutput, null] | [null, Error]>
  : (rawInput: TInput) => Promise<[TOutput, null] | [null, Error]>

// ─── Pipeline builder (before .action()) ─────────────────────────────────────

export type PipelineBuilder<
  TInput,
  TOutput,
  TMiddlewares extends Record<string, unknown>[],
> = {
  input: <TNewInput>(
    schema: Schema<TNewInput>,
  ) => PipelineBuilder<TNewInput, TOutput, TMiddlewares>
  output: <TNewOutput>(
    schema: Schema<TNewOutput>,
  ) => PipelineBuilder<TInput, TNewOutput, TMiddlewares>
  use: <TNewContext extends Record<string, unknown>>(
    middleware: Middleware<TNewContext>,
  ) => PipelineBuilder<TInput, TOutput, [...TMiddlewares, TNewContext]>
  onSuccess: (
    cb: (data: PipelineSuccessData<TOutput>) => MaybePromise<void>,
  ) => PipelineBuilder<TInput, TOutput, TMiddlewares>
  onError: (
    cb: (error: unknown) => MaybePromise<void>,
  ) => PipelineBuilder<TInput, TOutput, TMiddlewares>
  onStart: (
    cb: () => MaybePromise<void>,
  ) => PipelineBuilder<TInput, TOutput, TMiddlewares>
  middleware: <TContext extends Record<string, unknown>>(
    fn: (args: { ctx: MergeObjects<TMiddlewares> }) => MaybePromise<TContext>,
  ) => Middleware<TContext>
  action: [TOutput] extends [InferActionOutput]
    ? <TInferred>(
        fn: (args: {
          input: TInput
          ctx: MergeObjects<TMiddlewares>
        }) => MaybePromise<TInferred>,
      ) => ServerAction<TInput, TInferred>
    : (
        fn: (args: {
          input: TInput
          ctx: MergeObjects<TMiddlewares>
        }) => MaybePromise<TOutput>,
      ) => ServerAction<TInput, TOutput>
}

// ─── Result type ───────────────────────────────────────────────────────────────
export type KitteResult<
  TAction extends (...args: never[]) => Promise<readonly [unknown, unknown]>,
> = NonNullable<Awaited<ReturnType<TAction>>[0]>
