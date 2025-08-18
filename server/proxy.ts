import axios from 'axios'
import { Parser } from 'xml2js'
import { Elysia, t } from 'elysia'
import { dbGetById } from './db'
import type { SettingItem } from './db'

const parser = new Parser()

let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
const proxyConfig = (dbGetById('settings', 'httpProxy') as SettingItem).value
const httpProxy = proxyConfig.length > 10 ? new URL(proxyConfig) : null

export const httpClient = axios.create({
  proxy: httpProxy
    ? {
        protocol: httpProxy.protocol,
        host: httpProxy.hostname,
        port: parseInt(httpProxy.port),
        auth:
          httpProxy.username && httpProxy.password
            ? {
                username: httpProxy.username,
                password: httpProxy.password,
              }
            : undefined,
      }
    : false,
})

export const proxyRoute = new Elysia({ prefix: baseUrl }).get(
  '/proxy',
  async ({ query }) => {
    try {
      const { data: xmlStr } = await httpClient.get(query.url)
      const result = await parser.parseStringPromise(xmlStr)
      const titles = result.rss.channel[0].item.map(({ title: [title] }) => title)
      return titles
    } catch (e) {
      console.error(e)
      return 'Internal Server Error'
    }
  },
  {
    query: t.Object({ url: t.String() }),
  }
)

export default proxyRoute
