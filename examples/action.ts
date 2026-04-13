import z from "zod"
import { createKitte } from "../src"

const client = createKitte()

const actionInput = client
  .input(z.object({ name: z.string() }))
  .action(({ input }) => {
    return {
      message: input.name,
    }
  })

const action = client.action(() => {
  return {
    message: "Hello world",
  }
})

export async function usage() {
  const [firstResult, firstError] = await actionInput({ name: "John Doe" })
  if (!firstError) return firstResult.message

  const [secondResult, secondError] = await action()
  if (!secondError) return secondResult.message
}
