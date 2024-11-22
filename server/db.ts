import { JSONFilePreset } from 'lowdb/node'
import { Data } from 'json-server/lib/service'


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

await db.write();

export const dbGetById = (collection: string, id: string) => {
  const collectionData = db.data[collection]
  if (collectionData && Array.isArray(collectionData)) {
    return collectionData.find((item: any) => item.id === id)
  }
  return null
};

export default db;
