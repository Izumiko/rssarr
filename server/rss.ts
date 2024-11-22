import { Parser, Builder } from 'xml2js'
import qs from 'qs'
import { Elysia } from 'elysia'
import db, {dbGetById} from './db'
import type { Pattern, SettingItem } from './db'
import { httpClient } from './proxy'

const parser = new Parser()
const builder = new Builder()


interface RssItem {
  title: string[]
  link: string[]
  pubDate: string[]
  enclosure?: [{
    $: {
      url: string
      type: string
      length: number
    }
  }]
  torrent?: [{
    link: string
    contentLength: string
    pubDate: string
  }]
  guid: [{
    $: {
      isPermaLink: boolean
    }
    _: string
  }]
  description?: string[]
}

const appRss = <T extends string>(config: { prefix: T }) => new Elysia({
  name: 'rss',
  seed: config,
})
  .get(`${config.prefix}RSS/*`, async ({ path, query, headers, request, set, error }) => {
  try {
    const rss_url = path.replace(/^\/RSS\//, '')
    const { data: xmlStr } = await httpClient.get(
      `https://${rss_url}?${qs.stringify(query)}`
    )
    const result = await parser.parseStringPromise(xmlStr)

    const host = rss_url.split('/')[0]
    const isMikan = host.includes('mikan')

    // torrent proxy download url
    const proto = headers['x-forwarded-proto'] || request.url.split(':')[0]
    const proxyhost = headers['x-forwarded-host'] || headers['host']
    console.log(proto, proxyhost)
    let torrentProxy = proto + "://" + proxyhost + (dbGetById('settings', 'baseUrl') as SettingItem).value 
    if (torrentProxy.endsWith('/')) torrentProxy += 'torrent'
    else torrentProxy += '/torrent'

    console.log(torrentProxy)

    // pre-compile
    const database = db.data['patterns'] as Pattern[]
    const rules = database.map(({ pattern, ...rest }) => ({
      pattern: new RegExp(`^${pattern}$`),
      ...rest,
    }))
    const releaseGroup = /^[\[【](?<subgroup>[^\]】]+?)[\]】].*$/

    // trackers for magnet
    const trackers = new URLSearchParams()
    trackers.append("tr", "http://t.acg.rip:6699/announce")
    trackers.append("tr", "http://nyaa.tracker.wf:7777/announce")
    trackers.append("tr", "https://tr.bangumi.moe:9696/announce")
    trackers.append("tr", "https://tr.bangumi.moe:6969/announce")
    trackers.append("tr", "http://open.acgnxtracker.com/announce")
    trackers.append("tr", "https://open.acgnxtracker.com/announce")

    const items = [] as RssItem[]
    for (const item of result.rss.channel[0].item as RssItem[]) {
      const title = item.title[0]
      const link = item.link
      const enclosure = item?.enclosure || [{ $: { url: link[0], type: 'application/x-bittorrent', length: 0 } }]
      const pubDate = item?.pubDate || item?.torrent?.[0]?.pubDate || [new Date().toISOString()]
      const isMagnet = enclosure[0].$.url.startsWith("magnet:")
      for (const { pattern, series, season, language, quality, offset } of rules) {
        const match = title.match(pattern)
        if (!match?.groups?.episode) continue
        const { episode } = match.groups
        const episodeWithOffset =
          Number.parseInt(episode) + (offset || 0)
        const epWithPadding = episodeWithOffset.toString().padStart(2, "0")
        let group = ''
        if (match?.groups?.subgroup) {
          const { subgroup } = match.groups
          group = `[${subgroup}] `
        } else {
          const res = title.match(releaseGroup)
          if (res?.groups?.subgroup) {
            const { subgroup } = res.groups;
            group = `[${subgroup}] `
          }
        }
        const normalized = `${group}${series} - S${season}E${epWithPadding} - ${language} - ${quality}`
        let newUrl = ''
        if (isMagnet) {
          const trackersStr = trackers.toString()
          const dn = encodeURIComponent(normalized)
          const cleanMagnet = enclosure[0].$.url.split('&')[0]
          newUrl = `${cleanMagnet}&dn=${dn}&${trackersStr}`
        } else {
          const params = new URLSearchParams()
          params.append("url", enclosure[0].$.url)
          params.append("name", normalized)
          newUrl = `${torrentProxy}?${params.toString()}`
        }
        if (isMikan) {
          pubDate[0] = pubDate[0] + "+08:00"
        }
        items.push({
          title: [normalized],
          pubDate,
          enclosure: [
            {
              $: {
                url: newUrl,
                type: enclosure[0].$.type,
                length: enclosure[0].$.length || 0,
              },
            },
          ],
          link,
          guid: [
            {
              $: { isPermaLink: true },
              _: link[0],
            },
          ],
        })

        break
      }
    }
    // if items is empty, add placeholder to keep rss valid
    if (!items.length) items.push({
      title: ["Placeholder"],
      pubDate: [new Date().toISOString()],
      enclosure: [
        {
          $: {
            url: "https://placeholder.com",
            type: "application/x-bittorrent",
            length: 0,
          },
        },
      ],
      link: ["https://placeholder.com"],
      guid: [
        {
          $: { isPermaLink: true },
          _: "https://placeholder.com",
        },
      ],
    })
    result.rss.channel[0].item = items

    set.headers["Content-Type"] = "text/xml"
    return builder.buildObject(result)
  } catch (e) {
    console.error(e)
    error(500, "Internal Server Error")
  }
})

export default appRss
export { appRss }
