import axios, { AxiosError } from 'axios'
import parseTorrent from 'parse-torrent'
import { Elysia, t } from 'elysia'
import { httpClient } from './proxy'
import {dbGetById} from './db'
import type { SettingItem } from './db'

let qbUrl = (dbGetById('settings', 'qbittorrentUrl') as SettingItem).value

let QB_SID = ''
const login = async () => {
  try {
    qbUrl = (dbGetById('settings', 'qbittorrentUrl') as SettingItem).value
    const qbUser = (dbGetById('settings', 'qbittorrentUsername') as SettingItem).value
    const qbPass = (dbGetById('settings', 'qbittorrentPassword') as SettingItem).value
    
        const data = new URLSearchParams()
        data.append('username', qbUser)
        data.append('password', qbPass)
        const resp = await axios.post(`${qbUrl}/api/v2/auth/login`, data, {
            headers: {
                'Referer': `${qbUrl}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        QB_SID = resp.headers['set-cookie']![0].split(';')[0]
        QB_SID = QB_SID.slice(QB_SID.indexOf('=') + 1)
    } catch (e) {
        console.error(e)
    }
}

const renameTorrent = async (hash: string, name: string) => {
    const data = new URLSearchParams()
    data.append('hash', hash)
    data.append('name', name)
    try {
      const resp = await axios.post(`${qbUrl}/api/v2/torrents/rename`, data, {
        headers: {
          Cookie: `SID=${QB_SID}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).then(resp => {
        if (resp.status === 200) {
          console.log(`Renamed to ${name}`)
        }
        return resp.status
      })
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response?.status === 403) {
          await login()
        }
        switch (e.response?.status) {
          case 400:
            console.error('Bad request')
            break
          case 403:
            console.error('Forbidden, re-logging in...')
            break
          case 404:
            console.error(`${name} not found`)
            break
          default:
            console.error(e)
            break
        }
        return e.response?.status;
      }
      if (e instanceof Error) {
        console.error(e.message)
      }
    }
}

const appTorrent = <T extends string>(config: { prefix: T }) => new Elysia({
  name: 'torrent',
  seed: config,
})
  .get(`${config.prefix}torrent`, async ({ query, redirect }) => {
    const torrentUrl = query.url
    const newName = query.name
    console.log(`Downloading ${newName} from ${torrentUrl}`)

    if (!torrentUrl || !newName) {
        return 'Missing url or name'
    }

    // get torrent file to obtain infoHash
    let infoHash = ''
    try {
        infoHash = await httpClient.get(torrentUrl, { responseType: 'arraybuffer' })
            .then(async response => {
              const torrent = await parseTorrent(Buffer.from(response.data, 'binary'))
                return torrent?.infoHash || ''
            })
            .catch(e => {
                console.error(e)
                return ''
            });
        if (!infoHash) throw new Error('Failed to get infoHash')
    } catch (e) {
        console.error(e)
        return
    }

    // 302 redirect
    redirect(torrentUrl, 302)

    //detect qbittorrent is ready
    if (!QB_SID) {
        await login()
    }
    if (!QB_SID) {
        console.error('Failed to login to qBittorrent')
        return
    }

    // rename torrent
    let retries = 5;
    while (retries-- > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const status = await renameTorrent(infoHash, newName)
        if (status === 200) break
    }
})

await login()

export default appTorrent
export { appTorrent }