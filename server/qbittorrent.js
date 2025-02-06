import axios from 'axios';
import parseTorrent from 'parse-torrent'
import { srvRouter } from './server.js';

let QB_SID = '';
const login = async () => {
  try {
    const data = new URLSearchParams();
    data.append('username', process.env.QB_USER);
    data.append('password', process.env.QB_PASS);
    const resp = await axios.post(`${process.env.QB_URL}api/v2/auth/login`, data, {
      headers: {
        'Referer': `${process.env.QB_URL}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    QB_SID = resp.headers['set-cookie'][0].split(';')[0];
    QB_SID = QB_SID.slice(QB_SID.indexOf('=') + 1);
  } catch (e) {
    console.error(e);
  }
}

const renameTorrent = async (hash, name) => {
  const data = new URLSearchParams();
  data.append('hash', hash);
  data.append('name', name);
  try {
    const resp = await axios.post(`${process.env.QB_URL}/api/v2/torrents/rename`, data, {
      headers: {
        Cookie: `SID=${QB_SID}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if (resp.status === 200) {
      console.log(`Renamed to ${name}`);
    }
    return resp.status;
  } catch (e) {
    if (e.response.status === 403) {
      await login();
    }
    switch (e.response.status) {
      case 400:
        console.error('Bad request');
        break;
      case 403:
        console.error('Forbidden, re-logging in...');
        break;
      case 404:
        console.error(`${name} not found`);
        break;
      default:
        console.error(e);
        break;
    }
    return e.response.status;
  }
}

const getTorrent = async (req, res) => {
  const torrentUrl = req.query.url;
  const newName = req.query.name;
  console.log(`Downloading ${newName} from ${torrentUrl}`);

  // get torrent file to obtain infoHash
  let infoHash = null;
  try {
    infoHash = await axios.get(torrentUrl, { responseType: 'arraybuffer' })
      .then(async response => {
        const torrent = await parseTorrent(Buffer.from(response.data, 'binary'));
        return torrent.infoHash;
      })
      .catch(e => {
        console.error(e);
        return null;
      });
    if (!infoHash) return;
  } catch (e) {
    console.error(e);
    return;
  }

  // 302 redirect
  res.status(302).redirect(torrentUrl);

  //detect qbittorrent is ready
  if (!QB_SID) {
    await login();
  }
  if (!QB_SID) {
    console.error('Failed to login to qBittorrent');
    return;
  }

  // rename torrent
  let retries = 5;
  while (retries-- > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const status = await renameTorrent(infoHash, newName);
    if (status === 200) break;
  }
}

srvRouter.get('/torrent', getTorrent);
await login();