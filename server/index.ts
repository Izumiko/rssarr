import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import './db'
import { authRoute, isAuthenticated } from './jwt'
import { apiRoute } from './api'
import { proxyRoute } from './proxy'
import { torrentRoute } from './qbittorrent'
import { rssRoute } from './rss'
import { sonarrRoute } from './sonarr'
import torznabRoute from './torznab'

const port = parseInt(process.env.PORT || '12306')

const protectedApi = new Elysia().use(isAuthenticated).use(apiRoute).use(proxyRoute).use(sonarrRoute)

new Elysia()
  .use(cors())
  .use(staticPlugin({ assets: 'public' }))
  .use(authRoute)
  .use(rssRoute)
  .use(torrentRoute)
  .use(torznabRoute)
  .use(protectedApi)
  .listen(port, () => {
    console.log(`App started on port ${port}`)
  })
