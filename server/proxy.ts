import axios from 'axios'
import { Parser } from 'xml2js'
import { Elysia } from 'elysia'
import {dbGetById} from './db'
import type { SettingItem } from './db'

const parser = new Parser()

const proxyConfig = (dbGetById('settings', 'httpProxy') as SettingItem).value
const httpProxy = proxyConfig.length > 4 ? new URL(proxyConfig) : null

const httpClient = axios.create({
  proxy: httpProxy ? {
    protocol: httpProxy.protocol,
    host: httpProxy.hostname,
    port: parseInt(httpProxy.port),
    auth: httpProxy.username && httpProxy.password ? {
      username: httpProxy.username,
      password: httpProxy.password
    } : undefined
  } : false
})

const appProxy =<T extends string>(config: { prefix: T }) => new Elysia({
  name: 'proxy',
  seed: config,
})
  .get(`${config.prefix}proxy`,async ({ query }) => {
  try {
    if (!query?.url) {
      throw new Error('Missing url query parameter')
    }
    const { data: xmlStr } = await httpClient.get(query.url)
    const result = await parser.parseStringPromise(xmlStr)
    const titles = result.rss.channel[0].item.map(
      ({ title: [title] }) => title
    )
    return titles
  } catch (e) {
    console.error(e)
    return 'Internal Server Error'
  }
})

export default appProxy
export { appProxy, httpClient }
