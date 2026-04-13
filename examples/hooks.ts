import { createKitte } from "../src"

const client = createKitte()

export const action = client
  .onStart(() => {})
  .onError(() => {})
  .onSuccess(() => {})
  .action(() => ({ message: "Hello world" }))
