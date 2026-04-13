import z from "zod"
import { createKitte } from "../src"
import type { KitteResult } from "../src/lib/types"

const client = createKitte()
  .input(z.object({ name: z.string() }))
  .action(({ input }) => {
    return {
      message: input.name,
    }
  })

type Result = KitteResult<typeof client>

export const test: Result = {
  message: "Hello world",
}
