import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import {dbGetById} from './db'
import type { SettingItem } from './db'

const secret = (dbGetById('settings', 'jwtSecret') as SettingItem).value
const baseUrl = (dbGetById('settings', 'baseUrl') as SettingItem).value || '/'

const jwtPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: secret,
      algorithm: 'HS512',
    })
)

type JwtContext = {
    jwt: {
      sign: (payload: any) => Promise<string>;
      verify: (token: string) => Promise<any>;
    }
};

// Authentication route
const authRoute = new Elysia()
  .post(`${baseUrl}auth/login`, async ({ body, jwt }: { body: any } & JwtContext) => {
    const { username, password } = body;

    const adminUser =  (dbGetById('settings', 'adminUsername') as SettingItem).value
    const adminPass = (dbGetById('settings', 'adminPassword') as SettingItem).value

    if (username === adminUser && password === adminPass) {
      const token = await jwt.sign({
        username,
      });
      
      return {
        token
      };
    }
    
    throw new Error('Username or password incorrect');
  });

// JWT middleware
const jwtGuard = async ({ jwt, set }) => {
    try {
      const bearer = set.headers.authorization;
      if (!bearer || !bearer.startsWith('Bearer ')) {
        throw new Error('No token provided');
      }
  
      const token = bearer.split(' ')[1];
      const isValid = await jwt.verify(token);
      
      if (!isValid) {
        throw new Error('Invalid token');
      }
    } catch (e) {
      set.status = 401;
      return { error: 'Invalid token' };
    }
  };
  

export { jwtPlugin, authRoute, jwtGuard }
