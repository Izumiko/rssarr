import { Elysia } from 'elysia'
import { dbGetById } from './db'
import type { SettingItem } from './db'

let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

const settings = {
  baseUrl: baseUrl,
  sonarrUrl: (dbGetById('settings', 'sonarrApiUrl') as SettingItem).value,
  sonarrApiKey: (dbGetById('settings', 'sonarrApiKey') as SettingItem).value,
}

const targetUrl = settings.sonarrUrl.endsWith('/') ? settings.sonarrUrl + 'api/v3' : settings.sonarrUrl + '/api/v3'
const targetHost = new URL(targetUrl).host

export const sonarrRoute = new Elysia({ prefix: settings.baseUrl })
  .all('/sonarr/*', async ({ request }) => {
    const path = request.url.split('/sonarr')[1]

    const response = await fetch(`${targetUrl}${path}`, {
      method: request.method,
      headers: {
        ...request.headers,
        Host: targetHost,
        'x-forwarded-host': request.headers.get('host') || '',
        'x-forwarded-proto': 'http',
        'X-Api-Key': settings.sonarrApiKey,
      },
      body: request.body,
    })

    return response
  })
  .onError(({ code, error, set }) => {
    if (error instanceof Error) {
      console.error(`[Error] Code: ${code}, Message: ${error.message}`)

      switch (code) {
        case 'VALIDATION':
          set.status = 400
          break
        case 'NOT_FOUND':
          set.status = 404
          break
        default:
          set.status = 500
          break
      }

      return {
        error: error.message,
      }
    }

    console.error(`[Elysia Status] Code: ${code}, Value: ${JSON.stringify(error)}`)
    set.status = 500
    return {
      error: 'An unexpected issue occurred.',
    }
  })

export default sonarrRoute
