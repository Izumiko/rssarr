import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { jwtPlugin, authRoute, jwtGuard } from './jwt'
import { apiRoute } from './api'
import { appProxy } from './proxy'
import { appTorrent } from './qbittorrent'
import { appRss } from './rss'
import { appSonarr } from './sonarr'
import db from './db'
import type { Settings } from './db'

const baseUrl = (db.data['settings'] as Settings).baseUrl || '/'
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
