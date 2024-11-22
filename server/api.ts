import { Elysia } from 'elysia'
import { Item, isItem, Service } from 'json-server/lib/service'
import db, { Pattern } from './db'

const service = new Service(db)

const apiRoute = <T extends string>(config: { prefix: T }) => new Elysia({
  name: 'database-api',
  seed: config,
})
  .get(`${config.prefix}api/:name`, ({ params: { name }, query, set }) => {
  const q = Object.fromEntries(
    Object.entries(query)
      .map(([key, value]) => {
        if (
          ['_start', '_end', '_limit', '_page', '_per_page'].includes(key) &&
          typeof value === 'string'
        ) {
          return [key, parseInt(value)]
        } else {
          return [key, value]
        }
      })
    .filter(([, value]) => !Number.isNaN(value)),
  )
    const res = service.find(name, q) as Item[]
    set.headers['X-Total-Count'] = res.length.toString()
    return res
})
  .post(`${config.prefix}api/:name`, async ({ params: { name }, body }) => {
    if (isItem(body)) {
      body.offset = Number.parseInt(body.offset as string) || 0
      body.id = body.id || (Math.max(...(db.data[name] as Pattern[]).map(({ id }) => parseInt(id))) + 1).toString().padStart(4, '0')
    return await service.create(name, body)
  }
})
  .put(`${config.prefix}api/:name`, async ({ params: { name }, body }) => {
    if (isItem(body)) {
      body.offset = Number.parseInt(body.offset as string) || 0
      body.id = body.id || (Math.max(...(db.data[name] as Pattern[]).map(({ id }) => parseInt(id))) + 1).toString().padStart(4, '0')
    return await service.update(name, body)
  }
})
  .patch(`${config.prefix}api/:name`, async ({ params: { name }, body }) => {
    if (isItem(body)) {
      body.offset = Number.parseInt(body.offset as string) || 0
      body.id = body.id || (Math.max(...(db.data[name] as Pattern[]).map(({ id }) => parseInt(id))) + 1).toString().padStart(4, '0')
    return await service.patch(name, body)
  }
})
  .get(`${config.prefix}api/:name/:id`, ({ params: { name, id }, query }) => {
  return service.findById(name, id, query)
})
  .put(`${config.prefix}api/:name/:id`, async ({ params: { name, id }, body }) => {
  if (isItem(body)) {
    return await service.updateById(name, id, body)
  }
})
  .patch(`${config.prefix}api/:name/:id`, async ({ params: { name, id }, body }) => {
  if (isItem(body)) {
    return await service.patchById(name, id, body)
  }
})
  .delete(`${config.prefix}api/:name/:id`, async ({ params: { name, id }, query }) => {
  return await service.destroyById(name, id, query['_dependent'])
})

export { apiRoute }