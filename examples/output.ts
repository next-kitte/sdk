import z from "zod"
import { createKitte } from "../src"

const client = createKitte()

const action = client
  .output(z.object({ myOutputProperty: z.string() }))
  .action(() => {
    return { myOutputProperty: "Teste" }
  })

async function usage() {
  const [result, error] = await action()
  if (!error) {
    return result.myOutputProperty
  }
}

usage()
