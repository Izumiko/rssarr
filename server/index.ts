import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { jwtPlugin, authRoute, jwtGuard } from './jwt'
import { apiRoute } from './api'
import { appProxy } from './proxy'
import { appTorrent } from './qbittorrent'
import { appRss } from './rss'
import { appSonarr } from './sonarr'
import {dbGetById} from './db'
import type { SettingItem } from './db'

const baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || '/'
const port = parseInt(process.env.PORT || "12306")

new Elysia()
  .use(cors())
  .use(staticPlugin({assets: 'public'}))
  .use(jwtPlugin)
  .use(authRoute)
  .guard({ beforeHandle: [jwtGuard] }, (app) => 
    app.get('/api/*', () => 'Protected Content')
      .get('/sonarr/*', () => 'Protected Content')
      .get('/proxy', () => 'Protected Content')
      .get('/', () => 'Protected Content')
)
  .use(apiRoute({prefix: baseUrl}))
  .use(appProxy({ prefix: baseUrl }))
  .use(appRss({prefix: baseUrl}))
  .use(appTorrent({prefix: baseUrl}))
  .use(appSonarr({prefix: baseUrl}))
  .listen(port, () => {
  console.log(`App started on port ${port}`);
})
