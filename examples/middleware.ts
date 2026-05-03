import { createKitte } from "../src"

const client = createKitte()

const connectDatabase = () => {}

const middleware = client
  .onStart(async () => {
    await connectDatabase()
  })
  .middleware(() => {
    return {
      message: "Hello world",
    }
  })

const actionWithMiddleware = client.use(middleware).action(({ ctx }) => {
  return {
    message: ctx.message,
  }
})

export async function usage() {
  const [result, error] = await actionWithMiddleware()
  if (!error) {
    return result.message
  }
}
