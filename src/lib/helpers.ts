export const parseObject = <T>(data: T) => JSON.parse(JSON.stringify(data)) as T
