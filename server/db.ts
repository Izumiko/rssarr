import { JSONFilePreset } from 'lowdb/node'
import { Data, Item } from 'json-server/lib/service'


export type Pattern = {
  id: string,
  series: string,
  season: string,
  pattern: string,
  remote: string,
  offset: number,
  language: string,
  quality: string
}

export type SettingItem = {
  id: string,
  value: string
}


const defaultData: Data = {
  patterns: [] as Pattern[],
  settings: [
    {id:'sonarrApiKey', value:'your_sonarr_api_key'},
    {id:'sonarrApiUrl', value:'https://your_sonnar_host/'},
    {id:'adminUsername', value:'admin'},
    {id:'adminPassword', value:'admin'},
    {id:'baseUrl', value:'/'},
    {id:'whitelist', value: [
    'mikanime.tv',
    'mikanani.me',
    'nyaa.si',
    'acg.rip',
    'bangumi.moe',
    'share.dmhy.org'
    ].join(',')},
    {id:'jwtSecret', value:'A_VERY_LONG_SECRET'},
    {id:'qbittorrentUrl', value:'http://localhost:8080'},
    {id:'qbittorrentUsername', value:'admin'},
    {id:'qbittorrentPassword', value:'adminadmin'},
    { id: 'httpProxy', value: '' }
  ] as SettingItem[]
};

const db = await JSONFilePreset<Data>('data/database.json', defaultData);

(db.data['patterns'] as Pattern[]).forEach((pattern) => {
  // pattern.id = parseInt(pattern.id.toString());
  pattern.offset = parseInt(pattern.offset.toString()) || 0;
});

if (!db.data.settings || (db.data.settings as SettingItem[]).length < 11) {
  (db.data.settings as SettingItem[]).push({ id: 'sonarrApiKey', value: process.env.SONARR_API_KEY || '' });
  (db.data.settings as SettingItem[]).push({ id: 'sonarrApiUrl', value: process.env.SONARR_HOST || '' });
  (db.data.settings as SettingItem[]).push({ id: 'adminUsername', value: process.env.ADMIN_USERNAME || '' });
  (db.data.settings as SettingItem[]).push({ id: 'adminPassword', value: process.env.SONARR_API_KEY || '' });
  (db.data.settings as SettingItem[]).push({ id: 'baseUrl', value: process.env.BASE_URL || '' });
  (db.data.settings as SettingItem[]).push({ id: 'jwtSecret', value: process.env.JWT_SECRET || '' });
  (db.data.settings as SettingItem[]).push({ id: 'qbittorrentUrl', value: process.env.QB_URL || '' });
  (db.data.settings as SettingItem[]).push({ id: 'qbittorrentUsername', value: process.env.QB_USER || '' });
  (db.data.settings as SettingItem[]).push({ id: 'qbittorrentPassword', value: process.env.QB_PASS || '' });
  (db.data.settings as SettingItem[]).push({ id: 'httpProxy', value: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '' });
  (db.data.settings as SettingItem[]).push({ id: 'whitelist', value: [
    'mikanime.tv',
    'mikanani.me',
    'nyaa.si',
    'acg.rip',
    'bangumi.moe',
    'share.dmhy.org'
    ].join(',') });
}

await db.write();

export const dbGetById = (collection: string, id: string) => {
  const collectionData = db.data[collection]
  if (collectionData && Array.isArray(collectionData)) {
    return collectionData.find((item: Item) => item.id === id)
  }
  return null
};

export default db;
