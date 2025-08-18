import { Elysia, t } from 'elysia'
import db, { dbGetById, updateSetting } from './db'
import type { Pattern, SettingItem, Item } from './db'
import { smartCompare } from './utils'

let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

export const apiRoute = new Elysia({ prefix: baseUrl })
  .get('/api/:name', async ({ params: { name }, query, set }) => {
    const { _sort = 'id', _order = 'ASC', _start = '0', _end = '10', q } = query
    const start = parseInt(_start, 10)
    const end = parseInt(_end, 10)

    const collectionData = db.data[name]
    let results: Item[]
    if (collectionData && Array.isArray(collectionData)) {
      results = [...collectionData]
    } else {
      results = [collectionData]
    }

    if (q) {
      results = results.filter((p) =>
        Object.values(p).some((val) => String(val).toLowerCase().includes(q.toLowerCase()))
      )
    }

    results.sort((a, b) => {
      const comparison = smartCompare(a[_sort], b[_sort])
      return _order.toUpperCase() === 'DESC' ? -comparison : comparison
    })

    const total = results.length
    const paginatedResults = results.slice(start, end)

    set.headers['X-Total-Count'] = total.toString()
    set.headers['Content-Range'] = `${name} ${start}-${end}/${total}`

    return paginatedResults
  })
  .get('/api/:name/:id', async ({ params: { name, id }, set }) => {
    const collectionData = db.data[name]
    if (collectionData && Array.isArray(collectionData)) {
      const qid = name === 'patterns' ? Number(id) : id
      const item = collectionData.find((p) => p.id === qid)
      if (item) {
        return item
      }
    } else {
      if (collectionData.id === id) {
        return collectionData
      }
    }

    set.status = 404
    return { message: 'Post not found' }
  })
  .post(
    '/api/:name',
    async ({ params: { name }, body, set }) => {
      const newItemData = body as Omit<Pattern, 'id'>
      const maxId = Math.max(0, ...(db.data[name] as Pattern[]).map((p) => p.id))
      const newItem: Pattern = {
        ...newItemData,
        id: maxId + 1,
      }
      ;(db.data[name] as Pattern[]).push(newItem)
      await db.write()
      set.status = 201
      return newItem
    },
    {
      body: t.Object({
        series: t.String(),
        pattern: t.String(),
        remote: t.String(),
        offset: t.Number(),
        language: t.String(),
        quality: t.String(),
      }),
    }
  )
  .put(
    '/api/:name/:id',
    async ({ params: { name, id }, body, set }) => {
      const newItemData = body as Omit<Pattern | SettingItem, 'id'>
      let itemIndex = -1
      if ('series' in newItemData) {
        itemIndex = (db.data[name] as Pattern[]).findIndex((p) => p.id === parseInt(id))
      } else {
        itemIndex = (db.data[name] as SettingItem[]).findIndex((p) => p.id === id)
      }
      if (itemIndex === -1) {
        set.status = 404
        return { message: 'Item not found' }
      }
      const updatedItem = { ...db.data[name][itemIndex], ...newItemData }
      db.data[name][itemIndex] = updatedItem
      await db.write()
      return updatedItem
    },
    {
      body: t.Union([t.Object({
        series: t.String(),
        pattern: t.String(),
        remote: t.String(),
        offset: t.Number(),
        language: t.String(),
        quality: t.String(),
      }), t.Object({
        value: t.String()
      })]),
    }
  )
  .delete('/api/:name/:id', async ({ params: { name, id }, set }) => {
    const initialLength = (db.data[name] as Pattern[]).length
    db.data[name] = (db.data[name] as Pattern[]).filter((p) => p.id !== Number(id))
    if ((db.data[name] as Pattern[]).length < initialLength) {
      await db.write()
      set.status = 204
      return
    } else {
      set.status = 404
      return { message: 'Item not found' }
    }
  })
  .put(
    '/api/:name',
    async ({ params: { name }, body, set }) => {
      const newSettings = body as SettingItem[]
      if (!db.data[name]) {
        set.status = 404
        return { message: 'Setting not found' }
      }
      for (const s of newSettings) {
        updateSetting(name, s.id, s.value)
      }
      await db.write()
      return
    },
    {
      body: t.Array(
        t.Object({
          id: t.String(),
          value: t.String(),
        })
      ),
    }
  )
