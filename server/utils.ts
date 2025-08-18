import { Pattern } from './db'
// import { RssItem } from "./rss"
import { XmlJsRssItem } from './xml'
type TorznabParams = {
  rss_url: string
  params: {
    t: string | null
    q: string | null
    cat: string | null
    imdbid: string | null
    season: string | null
    ep: string | null
    limit: string | null
    offset: string | null
  }
}

export const parseParamsFinal = (url: string): TorznabParams => {
  // 1. 提取路径和查询部分
  const pathMatch = url.match(/\/Torznab\/(.*?)\/api\?/)
  if (!pathMatch)
    return {
      rss_url: '',
      params: { t: null, q: null, cat: null, imdbid: null, season: null, ep: null, limit: null, offset: null },
    }
  const rss_url = pathMatch[1] ? pathMatch[1] : ''

  // 2. 分离查询字符串
  const queryStartIndex = url.indexOf('api?')
  const queryString = url.slice(queryStartIndex + 4)

  // 3. 解析参数
  const params = new URLSearchParams(queryString)

  return {
    rss_url: rss_url,
    params: {
      t: params.get('t'),
      q: params.get('q'),
      cat: params.get('cat'),
      imdbid: params.get('imdbid'),
      season: params.get('season'),
      ep: params.get('ep'),
      limit: params.get('limit'),
      offset: params.get('offset'),
    },
  }
}

/**
 * 模糊匹配函数
 * @param {string} query - 搜索关键词（如 "Welcome to Japan Ms Elf"）
 * @param {string} title - 待匹配的标题（如 "[ANi] Welcome to Japan, Ms. Elf! - S03E01"）
 * @returns {boolean} 是否匹配
 */
export const fuzzyMatch = (query: string, title: string): boolean => {
  // 1. 标准化处理：转为小写并移除标点符号
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // 移除非单词、非空格字符
      .split(/\s+/) // 按空格分割为单词数组
      .filter((word) => word) // 移除空字符串

  // 2. 获取处理后的查询词和标题词
  const queryWords = normalize(query)
  const titleWords = normalize(title)

  // 3. 拼起查询词
  const queryStr = queryWords.join('')
  const titleStr = titleWords.join('')

  // 3. 检查标题是否包含查询词
  return titleStr.includes(queryStr)
}

export const processItems = async (items: XmlJsRssItem[], rules: Pattern[], torrentProxy: string, isMikan: boolean) => {
  const releaseGroup = /^[[【](?<subgroup>[^\]】]+?)[\]】].*$/
  const revExp = /[[\s][vV](?<rev>\d+?)[\]\s]/
  const trackers = new URLSearchParams()
  trackers.append('tr', 'http://t.acg.rip:6699/announce')
  trackers.append('tr', 'http://nyaa.tracker.wf:7777/announce')
  trackers.append('tr', 'https://tr.bangumi.moe:9696/announce')
  trackers.append('tr', 'https://tr.bangumi.moe:6969/announce')
  trackers.append('tr', 'http://open.acgnxtracker.com/announce')
  trackers.append('tr', 'https://open.acgnxtracker.com/announce')

  const processedItems = [] as XmlJsRssItem[]
  for (const item of items) {
    const title = item.title[0]
    const link = item.link
    const enclosure = item?.enclosure || [{ $: { url: link[0], type: 'application/x-bittorrent', length: '0' } }]
    const pubDate = item?.pubDate ||
      (item?.torrent?.[0]?.pubDate && [item?.torrent?.[0]?.pubDate]) || [new Date().toISOString()]
    const isMagnet = enclosure[0].$.url.startsWith('magnet:')
    const revMatch = title.match(revExp)

    let titleCleaned = title
    let rev = ''
    if (revMatch?.groups?.rev) {
      titleCleaned = title.replace(revExp, '')
      rev = `v${revMatch.groups.rev}`
    }

    for (const { pattern, series, season, language, quality, offset } of rules) {
      const match = titleCleaned.match(pattern)
      if (!match?.groups?.episode) continue
      const { episode } = match.groups
      const episodeWithOffset = Number.parseInt(episode) + (offset || 0)
      const epWithPadding = episodeWithOffset.toString().padStart(2, '0')

      let group = ''
      if (match?.groups?.subgroup) {
        group = `[${match.groups.subgroup}] `
      } else {
        const res = titleCleaned.match(releaseGroup)
        if (res?.groups?.subgroup) {
          group = `[${res.groups.subgroup}] `
        }
      }

      const normalized = `${group}${series} - S${season}E${epWithPadding}${rev} - ${language} - ${quality}`
      let newUrl = ''

      if (isMagnet) {
        const trackersStr = trackers.toString()
        const dn = encodeURIComponent(normalized)
        const cleanMagnet = enclosure[0].$.url.split('&')[0]
        newUrl = `${cleanMagnet}&dn=${dn}&${trackersStr}`
      } else {
        const params = new URLSearchParams()
        params.append('url', enclosure[0].$.url)
        params.append('name', normalized)
        newUrl = `${torrentProxy}?${params.toString()}`
      }

      if (isMikan) {
        pubDate[0] = pubDate[0] + '+08:00'
      }

      processedItems.push({
        title: [normalized],
        pubDate,
        description: item.description ?? [''],
        enclosure: [
          {
            $: {
              url: newUrl,
              type: enclosure[0].$.type,
              length: enclosure[0].$.length || '0',
            },
          },
        ],
        link,
        guid: [
          {
            $: { isPermaLink: 'true' },
            _: link[0],
          },
        ],
      })
      break
    }
  }

  if (processedItems.length === 0) {
    processedItems.push(createPlaceholderItem())
  }

  return processedItems
}

const createPlaceholderItem = (): XmlJsRssItem => ({
  title: ['Placeholder'],
  pubDate: [new Date().toISOString()],
  description: ['Placeholder'],
  enclosure: [
    {
      $: {
        url: 'https://placeholder.com',
        type: 'application/x-bittorrent',
        length: '0',
      },
    },
  ],
  link: ['https://placeholder.com'],
  guid: [
    {
      $: { isPermaLink: 'true' },
      _: 'https://placeholder.com',
    },
  ],
})

export const smartCompare = (a: unknown, b: unknown): number => {
  // Handle null/undefined values to sort them consistently
  if (a == null && b == null) return 0
  if (a == null) return -1 // a is null/undefined, sort it first
  if (b == null) return 1 // b is null/undefined, sort it first

  const typeA = typeof a
  const typeB = typeof b

  // If both are numbers, perform a numeric sort
  if (typeA === 'number' && typeB === 'number') {
    return Number(a) - Number(b)
  }

  // If both are strings that look like dates, compare them as dates
  if (typeA === 'string' && typeB === 'string') {
    const dateA = Date.parse(a as string)
    const dateB = Date.parse(b as string)
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB
    }
  }

  // Fallback to localeCompare for strings or mixed types
  // This correctly handles '10' vs '2' and international characters
  return String(a).localeCompare(String(b))
}
