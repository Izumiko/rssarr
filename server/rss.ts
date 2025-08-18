import { Parser, Builder } from 'xml2js'
import qs from 'qs'
import { Elysia } from 'elysia'
import { AxiosResponse } from 'axios'
import db, { dbGetById } from './db'
import type { Pattern, SettingItem } from './db'
import { httpClient } from './proxy'
import { processItems } from './utils'
import { XmlJsRssRoot } from './xml'

const parser = new Parser()
const builder = new Builder()

let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

export const rssRoute = new Elysia({ prefix: baseUrl })
  .get('/RSS/*', async ({ path, query, request, set }) => {
    const rss_url = path.replace(/^\/RSS\//, '')
    const resp: AxiosResponse<string> = await httpClient.get(`https://${rss_url}?${qs.stringify(query)}`)
    const xmlStr = resp.data
    const result: XmlJsRssRoot = await parser.parseStringPromise(xmlStr)

    const host = rss_url.split('/')[0]
    const isMikan = host.includes('mikan')

    // pre-compile
    const database = db.data['patterns'] as Pattern[]
    const rules = database.map(({ pattern, ...rest }) => ({
      pattern: new RegExp(`^${pattern}$`),
      ...rest,
    }))

    // get torrent proxy url
    const reqUrl = new URL(request.url)
    const proto = request.headers.get('x-forwarded-proto') || reqUrl.protocol.slice(0, -1)
    const proxyhost = request.headers.get('x-forwarded-host') || reqUrl.host
    const torrentProxy = `${proto}://${proxyhost}${baseUrl}torrent`

    const items = await processItems(result.rss.channel[0].item, rules, torrentProxy, isMikan)

    result.rss.channel[0].item = items

    set.headers['Content-Type'] = 'text/xml'
    return builder.buildObject(result)
  })
  .onError(({ code, error, set }) => {
    if (error instanceof Error) {
      console.error(`[Error] Code: ${code}, Message: ${error.message}`)

      switch (code) {
        case 'VALIDATION':
          set.status = 400
          break
        case 'NOT_FOUND':
          set.status = 404
          break
        default:
          set.status = 500
          break
      }

      return {
        error: error.message,
      }
    }

    console.error(`[Elysia Status] Code: ${code}, Value: ${JSON.stringify(error)}`)
    set.status = 500
    return {
      error: 'An unexpected issue occurred.',
    }
  })

export default rssRoute

