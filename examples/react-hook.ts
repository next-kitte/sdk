import z from "zod"
import { createKitte, useKitteAction } from "../src"

const action = createKitte()
  .input(z.object({ name: z.string() }))
  .action(({ input }) => {
    return {
      message: input.name,
    }
  })

export function App() {
  const { data, status, error, execute } = useKitteAction(action)

  execute({ name: "John Doe" })
  if (status === "loading") {
    return "Loading..."
  }
  if (status === "error") {
    return String(error)
  }
  if (status === "success") {
    return data.message
  }

  return null
}
