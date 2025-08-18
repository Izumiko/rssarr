import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { bearer } from '@elysiajs/bearer'
import { dbGetById } from './db'
import type { SettingItem } from './db'

const secret = (dbGetById('settings', 'jwtSecret') as SettingItem).value
let baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || ''
baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

export const jwtSetup = jwt({
  name: 'jwt',
  secret: secret,
  schema: t.Object({
    username: t.String(),
  }),
})

// Authentication route
export const authRoute = new Elysia({ prefix: baseUrl }).use(jwtSetup).post(
  '/auth/login',
  async ({ body, jwt, set }) => {
    const { username, password } = body

    const adminUser = (dbGetById('settings', 'adminUsername') as SettingItem).value
    const adminPass = (dbGetById('settings', 'adminPassword') as SettingItem).value

    if (username === adminUser && password === adminPass) {
      const token = await jwt.sign({
        username,
      })
      return { token }
    }

    set.status = 401
    return { error: 'Username or password incorrect' }
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
  }
)

export const isAuthenticated = (app: Elysia) =>
  app
    .use(jwtSetup)
    .use(bearer())
    .derive(async ({ jwt, bearer, set }) => {
      const profile = await jwt.verify(bearer)

      if (!profile) {
        set.status = 401
        return { error: 'Unauthorized' }
      }

      return {
        user: profile,
      }
    })

export default authRoute
