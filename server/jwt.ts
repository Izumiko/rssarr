import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import db from './db'
import type { Settings } from './db'

const secret = (db.data['settings'] as Settings).jwtSecret
const adminUser = (db.data['settings'] as Settings).adminUsername
const adminPass = (db.data['settings'] as Settings).adminPassword
const baseUrl = (db.data['settings'] as Settings).baseUrl || '/'

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
    console.log(username, password);
    
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
