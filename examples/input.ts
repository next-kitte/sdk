import z from "zod"
import { createKitte } from "../src"

const client = createKitte()

const action = client
  .input(z.object({ name: z.string() }))
  .action(({ input }) => {
    return { name: input.name }
  })

async function usage() {
  const [result, error] = await action({ name: "John Doe" })
  if (!error) {
    return result.name
  }
}

usage()
