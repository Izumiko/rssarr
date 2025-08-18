import { Parser, Builder } from 'xml2js'
import { Elysia } from 'elysia'
import { AxiosResponse } from 'axios'
import db, { dbGetById } from './db'
import type { Pattern, SettingItem } from './db'
import { httpClient } from './proxy'
import { XmlJsRssRoot } from './xml'

import { processItems, parseParamsFinal, fuzzyMatch } from './utils'

const parser = new Parser()
const builder = new Builder()

let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

export const torznabRoute = new Elysia({ prefix: baseUrl })
  .get('/Torznab/*', async ({ query, request, set }) => {
    const { rss_url, params } = parseParamsFinal(request.url)

    const reqUrl = new URL(request.url)

    // Handle capabilities request
    if (params.t === 'caps') {
      const capsXml = {
        caps: {
          server: {
            $: {
              version: '1.0',
              title: 'RSSarr',
              strapline: 'RSS to Torznab Proxy',
              url: reqUrl.protocol + '//' + reqUrl.host,
            },
          },
          limits: {
            $: {
              max: '100',
              default: '50',
            },
          },
          registration: {
            $: {
              available: 'no',
              open: 'no',
            },
          },
          searching: {
            search: { $: { available: 'yes', supportedParams: 'q' } },
            'tv-search': { $: { available: 'yes', supportedParams: 'q,season,ep' } },
            'movie-search': { $: { available: 'no' } },
          },
          categories: {
            category: [
              {
                $: { id: '5000', name: 'TV' },
                subcat: [{ $: { id: '5030', name: 'TV/HD' } }],
              },
            ],
          },
        },
      }
      set.headers['Content-Type'] = 'text/xml'
      return builder.buildObject(capsXml)
    }

    const resp: AxiosResponse<string> = await httpClient.get(`https://${rss_url}`)
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
    const proto = request.headers.get('x-forwarded-proto') || reqUrl.protocol.slice(0, -1)
    const proxyhost = request.headers.get('x-forwarded-host') || reqUrl.host
    const torrentProxy = `${proto}://${proxyhost}${baseUrl}torrent`

    const items = await processItems(result.rss.channel[0].item, rules, torrentProxy, isMikan)

    // Filter items based on query parameters
    const filteredItems = items
      .filter((item) => {
        const { q, cat, imdbid, season, ep } = params
        const title = item.title[0]
        const category = item.category?.toString() || '5030'

        // // Search type filtering
        // if (t === 'tvsearch' && !title.includes('season')) return false;
        // if (t === 'movie' && !title.includes('movie')) return false;

        // Text search
        if (q && !fuzzyMatch(q, title)) return false

        // Category filtering
        if (cat) {
          const categories = cat.split(',').map((c) => c.trim())
          if (!categories.includes(category)) return false
        }

        // IMDb ID matching
        if (imdbid && !item.guid?.includes(imdbid)) return false

        // Season/Episode filtering
        if (season) {
          const itemSeason = title.match(/S(\d{2})/i)?.[1] || ''
          if (parseInt(season) !== parseInt(itemSeason)) return false
        }
        if (ep) {
          const itemEp = title.match(/E(\d{2})/i)?.[1] || ''
          if (parseInt(ep) !== parseInt(itemEp)) return false
        }

        return true
      })
      // Pagination
      .slice(parseInt(query.offset) || 0, (parseInt(query.limit) || 100) + (parseInt(query.offset) || 0))

    // Build Torznab-compatible XML
    const torznabFeed = {
      rss: {
        $: {
          version: '2.0',
          'xmlns:torznab': 'http://torznab.com/schemas/2015/feed',
        },
        channel: {
          title: 'Torznab Feed',
          link: request.url,
          description: 'Torznab-compatible feed',
          item: filteredItems.map((item) => ({
            title: item.title,
            guid: item.guid,
            link: item.link,
            pubDate: item.pubDate,
            category: 5000,
            enclosure: {
              $: {
                url: item.enclosure![0].$.url,
                type: item.enclosure![0].$.type,
                length: item.enclosure![0].$.length,
              },
            },
            'torznab:attr': [
              { $: { name: 'seeders', value: '100' } },
              { $: { name: 'peers', value: '100' } },
              { $: { name: 'downloadvolumefactor', value: '0.0' } },
            ],
          })),
        },
      },
    }

    set.headers['Content-Type'] = 'text/xml'
    return builder.buildObject(torznabFeed)
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

export default torznabRoute
