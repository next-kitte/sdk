# next-kitte

A Next.js server actions library with schema validation and middleware support.

## Description

next-kitte provides a cleaner, type-safe way to create Next.js server actions with built-in schema validation using Zod and middleware support for adding context to your actions.

## Installation

```bash
npm install next-kitte
# or
pnpm add next-kitte
# or
yarn add next-kitte
```

## Quick Start

Define a server action with validation and middleware:

```typescript
// actions.ts
import { Kitte } from "next-kitte"
import { z } from "zod"

const myAction = new Kitte()
  .schema(z.object({ name: z.string() }))
  .use(async ({ input, ctx }) => ({ user: "demo" }))
  .action(async ({ input, ctx }) => {
    return { message: `Hello, ${input.name}!` }
  })

export const helloAction = myAction.action
```

Use it on the client:

```tsx
// ClientComponent.tsx
"use client"

import { useKitteAction } from "next-kitte"
import { helloAction } from "./actions"

export function ClientComponent() {
  const { execute, status, data, error } = useKitteAction(helloAction)

  return (
    <button
      onClick={() => execute({ name: "World" })}
      disabled={status === "loading"}
    >
      {status === "loading" ? "Loading..." : "Say Hello"}
    </button>
  )
}
```

## Core Concepts

### Kitte Class

The core class for defining server actions with validation and middleware.

```typescript
const action = new Kitte()
  .schema(zodSchema)   // Optional: Zod schema for input validation
  .use(middleware)     // Optional: Add context middleware
  .action(handler)     // Required: Define the action handler
```

### Schema Validation

Use Zod schemas to validate client inputs before the action runs:

```typescript
const validatedAction = new Kitte()
  .schema(z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }))
  .action(async ({ input }) => {
    // input is type-safe and validated
    return { success: true }
  })
```

### Middleware

Add context to your actions with middleware. Middlewares run in order and can add properties to the context:

```typescript
const authAction = new Kitte()
  .use(async ({ input, ctx }) => {
    const user = await getUser()
    return { user }
  })
  .use(async ({ input, ctx }) => {
    const permissions = await getPermissions(ctx.user.id)
    return { permissions }
  })
  .action(async ({ input, ctx }) => {
    // ctx now contains { user, permissions }
    return ctx
  })
```

### Reusable Middleware

Create reusable middleware that can be shared across multiple actions:

```typescript
// Create a reusable middleware with .middleware()
const authMiddleware = new Kitte().middleware(async ({ input, ctx }) => {
  const user = await getUser()
  return { user }
})

// Use it in any action with .use()
const protectedAction = new Kitte()
  .use(authMiddleware)
  .action(async ({ input, ctx }) => {
    // ctx now contains { user }
    return { authorized: true, user: ctx.user }
  })
```

This pattern allows you to define common middleware (like auth, logging, or feature flags) once and reuse them across multiple actions.

## API Reference

### `new Kitte(schema?)`

Creates a new Kitte instance. Optionally pass a Zod schema for input validation.

```typescript
const kitte = new Kitte()
const kitteWithSchema = new Kitte(z.object({ name: z.string() }))
```

### `.schema(schema)`

Sets or updates the Zod schema for input validation.

```typescript
const action = new Kitte()
  .schema(z.object({ name: z.string() }))
```

### `.use(middlewareFn)`

Adds a middleware function that receives `{ input, ctx }` and returns `{ ctx: TNewCtx }`. Middlewares run sequentially before the action handler.

```typescript
const action = new Kitte()
  .use(async ({ input, ctx }) => ({ user: await getUser() }))
```

### `.middleware(fn)`

Creates a reusable middleware that can be shared across multiple actions. Returns a middleware function compatible with `.use()`.

```typescript
const authMiddleware = new Kitte().middleware(async ({ input, ctx }) => {
  const user = await getUser()
  return { user }
})

// Use the reusable middleware in any action
const action = new Kitte()
  .use(authMiddleware)
  .action(async ({ input, ctx }) => { ... })
```

### `.action(handlerFn)`

Defines the action handler function. Receives `{ input, ctx }` and returns the action result.

```typescript
const action = new Kitte()
  .action(async ({ input, ctx }) => {
    return { success: true, input }
  })
```

### `useKitteAction(action, options?)`

React hook for executing server actions on the client.

```typescript
const {
  data,    // TOutput | null - the action result on success
  status,  // "idle" | "loading" | "success" | "error"
  error,   // unknown | null - the error on failure
  execute, // (input: TInput) => Promise<ActionResult<TOutput>>
} = useKitteAction(action, {
  onSuccess?: (data) => void,
  onError?: (error) => void,
})
```

### Types

#### `ActionResult<T>`

The return type of actions: `[T, null] | [null, PossibleError]`

#### `Params<Schema, TCtx>`

The parameter passed to middleware and action handlers:

```typescript
{
  input: z.infer<Schema>  // The validated input
  ctx: TCtx               // The accumulated context from middlewares
}
```

#### `PossibleError`

Error type: `Error | ZodError`

## Full Example

### Server Side (`app/actions.ts`)

```typescript
import { Kitte } from "next-kitte"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export const createUserAction = new Kitte()
  .schema(createUserSchema)
  .use(async ({ input, ctx }) => {
    // Add authenticated user to context
    return { currentUser: { id: "user-123", role: "admin" } }
  })
  .action(async ({ input, ctx }) => {
    // input: { name: string, email: string }
    // ctx: { currentUser: { id: string, role: string } }

    // Perform the action (e.g., save to database)
    const user = await saveUser(input)

    return { success: true, user }
  })
```

### Client Side (`app/components/CreateUser.tsx`)

```tsx
"use client"

import { useKitteAction } from "next-kitte"
import { createUserAction } from "../actions"

export function CreateUser() {
  const { execute, status, data, error } = useKitteAction(createUserAction)

  const handleSubmit = async (formData: FormData) => {
    const [result, error] = await execute({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
    })
    

    if (result) {
      console.log("User created:", result.user)
    } else {
      console.error("Error:", error)
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Creating..." : "Create User"}
      </button>
      {error && <p>Error: {String(error)}</p>}
    </form>
  )
}
```

## License

MIT
