import { JSONFilePreset } from 'lowdb/node'

export type Item = {
  [x: string]: unknown
}

type Data = {
  [x: string]: Item[] | Item
}

export type Pattern = {
  id: number
  series: string
  season: number
  pattern: string | RegExp
  remote: string
  offset: number
  language: string
  quality: string
}

export type SettingItem = {
  id: string
  value: string
}

const defaultData: Data = {
  patterns: [] as Pattern[],
  settings: [
    { id: 'sonarrApiKey', value: 'your_sonarr_api_key' },
    { id: 'sonarrApiUrl', value: 'https://your_sonnar_host/' },
    { id: 'adminUsername', value: 'admin' },
    { id: 'adminPassword', value: 'admin' },
    { id: 'baseUrl', value: '/' },
    {
      id: 'whitelist',
      value: ['mikanime.tv', 'mikanani.me', 'nyaa.si', 'acg.rip', 'bangumi.moe', 'share.dmhy.org'].join(','),
    },
    { id: 'jwtSecret', value: 'A_VERY_LONG_SECRET' },
    { id: 'qbittorrentUrl', value: 'http://localhost:8080' },
    { id: 'qbittorrentUsername', value: 'admin' },
    { id: 'qbittorrentPassword', value: 'adminadmin' },
    { id: 'httpProxy', value: '' },
  ] as SettingItem[],
}

export const db = await JSONFilePreset<Data>('data/database.json', defaultData)

const patterns = db.data['patterns'] as Pattern[]

patterns.forEach((pattern) => {
  pattern.id = parseInt(pattern.id.toString())
  pattern.season = parseInt(pattern.season.toString())
  pattern.offset = parseInt(pattern.offset.toString()) || 0
})

export const updateSetting = (collection: string, id: string, value: string) => {
  const collectionData = db.data[collection]
  if (collectionData) {
    if (Array.isArray(collectionData)) {
      const itemIndex = collectionData.findIndex((item: Item) => item.id === id)
      if (itemIndex > -1) {
        db.data[collection][id] = value
      } else {
        ;(db.data[collection] as SettingItem[]).push({ id, value })
      }
    }
  } else {
    db.data[collection] = [{ id, value }]
  }
}

export const migrateSetting = async () => {
  if (!db.data.settings || (db.data.settings as SettingItem[]).length < 11) {
    updateSetting('settings', 'sonarrApiKey', process.env.SONARR_API_KEY || 'your_sonarr_api_key')
    updateSetting('settings', 'sonarrApiUrl', process.env.SONARR_HOST || 'https://your_sonnar_host/')
    updateSetting('settings', 'adminUsername', process.env.ADMIN_USERNAME || 'admin')
    updateSetting('settings', 'adminPassword', process.env.ADMIN_PASSWORD || 'admin')
    updateSetting('settings', 'baseUrl', process.env.BASE_URL || '/')
    updateSetting('settings', 'jwtSecret', process.env.JWT_SECRET || 'A_VERY_LONG_SECRET')
    updateSetting('settings', 'qbittorrentUrl', process.env.QB_URL || 'http://localhost:8080')
    updateSetting('settings', 'qbittorrentUsername', process.env.QB_USER || 'admin')
    updateSetting('settings', 'qbittorrentPassword', process.env.QB_PASS || 'adminadmin')
    updateSetting('settings', 'httpProxy', process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '')
    updateSetting(
      'settings',
      'whitelist',
      ['mikanime.tv', 'mikanani.me', 'nyaa.si', 'acg.rip', 'bangumi.moe', 'share.dmhy.org'].join(',')
    )
  }

  await db.write()
}

await migrateSetting()

export const dbGetById = (collection: string, id: string) => {
  const collectionData = db.data[collection]
  if (collectionData && Array.isArray(collectionData)) {
    return collectionData.find((item: Item) => item.id === id)
  }
  return null
}

export default db
