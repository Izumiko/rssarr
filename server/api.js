import db from './db.cjs';
import jsonServer from 'json-server';
import { srvRouter } from './server.js';
import middlewares from './jwt.js';
import './torznab.js';

const router = jsonServer.router(db);
const addId = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.body.offset = Number.parseInt(req.body.offset) || 0;
        req.body.id = req.body.id || Math.max(...(db.get('patterns').value()).map(({ id }) => id)) + 1;
    }
    next();
};

srvRouter.use("/api", ...middlewares, addId, router);
