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

export type Settings = {
  sonarrApiKey: string,
  sonarrApiUrl: string,
  adminUsername: string,
  adminPassword: string,
  baseUrl: string,
  whitelist: string[],
  jwtSecret: string,
  qbittorrentUrl: string,
  qbittorrentUsername: string,
  qbittorrentPassword: string,
  httpProxy: string
}

const defaultData: Data = {
  patterns: [],
  settings: {
    sonarrApiKey: 'your_sonarr_api_key',
    sonarrApiUrl: 'https://your_sonnar_host/',
    adminUsername: 'admin',
    adminPassword: 'admin',
    baseUrl: '/',
    whitelist: [
      'mikanime.tv',
      'mikanani.me',
      'nyaa.si',
      'acg.rip',
      'bangumi.moe',
      'share.dmhy.org'
    ],
    jwtSecret: 'A_VERY_LONG_SECRET',
    qbittorrentUrl: 'http://localhost:8080',
    qbittorrentUsername: 'admin',
    qbittorrentPassword: 'adminadmin',
    httpProxy: ''
  }
};

const db = await JSONFilePreset<Data>('data/database.json', defaultData);

(db.data['patterns'] as Pattern[]).forEach((pattern) => {
  // pattern.id = parseInt(pattern.id.toString());
  pattern.offset = parseInt(pattern.offset.toString()) || 0;
});

await db.write();

export default db;
