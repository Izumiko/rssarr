import { Elysia } from 'elysia'
import db from './db'
import type { Settings } from './db'

const sonarrUrl = (db.data['settings'] as Settings).sonarrApiUrl
const sonarrApiKey = (db.data['settings'] as Settings).sonarrApiKey
const targetUrl = sonarrUrl.endsWith('/') ? sonarrUrl + 'api/v3' : sonarrUrl + '/api/v3'

const appSonarr = <T extends string>(config: { prefix: T }) => new Elysia({
  name: 'sonarr-api',
  seed: config,
})
  .all(`${config.prefix}sonarr/*`, async ({ request }) => {
    const path = request.url.split('/sonarr')[1]

    try {
      const response = await fetch(`${targetUrl}${path}`, {
        method: request.method,
        headers: {
          ...request.headers,
          'Host': new URL(targetUrl).host,
          'x-forwarded-host': request.headers.get('host') || '',
          'x-forwarded-proto': 'http',
          'X-Api-Key': sonarrApiKey
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' 
          ? await request.blob() 
          : undefined
      })

      const body = await response.blob()
      
      return new Response(body, {
        status: response.status,
        headers: response.headers
      })
    } catch (error) {
      return new Response('Proxy Error: ' + error.message, {
        status: 500
      })
    }
  })

export default appSonarr
export { appSonarr }