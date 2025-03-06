import fs from 'fs';
import path from 'path';
import ConnectionManager from './structures/ConnectionManager';
import express from 'express';
import { createServer } from 'http';
import AppRouter from './router/router';
import multer from 'multer';

const app = express();

let port = Number(process.env.SERVER_PORT);
if (isNaN(port)) port = 3010;

const cachePath = path.resolve(__dirname, '..', 'cache');

if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

const server = createServer(app);
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cachePath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
});
const upload = multer({ storage: storage });
const appRouter = new AppRouter(server, upload);

app.use(express.json());

app.use(appRouter.getRouter());

server.listen(port, () => {
  console.log('Listening on', port);
});