import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'crypto';
import { Router } from 'express';
import DataBaseManager from '../database/DataBaseManager';
import { IncomingMessage, Server } from 'http';
import ConnectionManager, { ECommands } from '../structures/ConnectionManager';
import IUser from '../interfaces/user';
import Stream from 'stream';
import multer from 'multer';
import ITranscription from '../interfaces/transcription';
import path from 'path';
import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import fs from 'fs';

export default class appRouter {
  private router = Router();
  private wsConnMgr = new ConnectionManager();
  private sessions: [string, IUser, WebSocket | null][] = [];
  private dbManager = new DataBaseManager();

  constructor(server: Server, cacheEngine: multer.Multer) {
    this.router.post('/register', this.postRegister.bind(this));
    this.router.post('/login', this.postLogin.bind(this));
    this.router.use(this.authMiddleware.bind(this));
    server.on('upgrade', this.webSocketUpgrade.bind(this));

    this.router.post('/transcribe', cacheEngine.single('file'), this.transcribe.bind(this));
    this.router.get('/transcriptions', this.getTranscriptions.bind(this));
    this.router.get('/downloadTranscriptions/:filename', this.downloadTranscriptions.bind(this));
    this.router.delete('/transcriptions/:id', this.deleteTranscription.bind(this));
  }

  getRouter() {
    return this.router;
  }

  createSession(userData: IUser) {
    const sessionId = randomUUID();
    const sessionIndex = this.sessions.push([sessionId, userData, null]);

    // logs users out after 24 hours
    setTimeout(() => {
      this.sessions.splice(sessionIndex - 1, 1);
    }, 24 * 60 * 60 * 1000); // 1 day
    return sessionId;
  }

  postRegister(req: Express.Request & any, res: Express.Response & any) {
    if (!req.body) {
      res.status(400).json({ error: true, message: 'Invalid Body!' });
      return;
    }
    if (!req.body.name || !req.body.email || !req.body.password) {
      res.status(400).json({ error: true, message: 'Missing parameters!' });
      return;
    }

    const email: string = req.body.email;
    const name: string = req.body.name;
    const password: string = req.body.password;

    if (!email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)) {
      res.status(400).json({ error: true, message: 'Invalid Email!'});
      return;
    }

    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, buf) => {
      if (err) {
        res.status(500).json({ error: true, message: 'Couldn\'t process!'});
        return;
      }

      const hashedPassword = `${salt}.${buf.toString("hex")}`;

      const newUserData = this.dbManager.createUser({
        name: name,
        email: email,
        passwordHash: hashedPassword,
      });

      const session = this.createSession(newUserData);

      res.json({ error: false, content: {
        sessionId: session,
        username: name,
      }});
    });
  }

  postLogin(req: Express.Request & any, res: Express.Response & any) {
    if (!req.body) {
      res.status(400).json({ error: true, message: 'Invalid Body!' });
      return;
    }
    const email: string = req.body.email;
    const password: string = req.body.password;
    if (!email || !password) {
      res.status(400).json({ error: true, message: 'Missing parameters!' });
      return;
    }

    const userData = this.dbManager.findUser(req.body.email);
    if (!userData) {
      res.status(403).json({ error: true, message: 'User with email doesn\'t exists!'})
      return;
    }

    const [salt, correctPass] = userData.passwordHash.split('.');
    const correctPassBuf = Buffer.from(correctPass, 'hex');
    scrypt(password, salt, 64, (err, buf) => {
      if (err || !timingSafeEqual(correctPassBuf, buf)) {
        res.status(403).json({ error: true, message: 'Invalid Password!'});
        return;
      }

      const session = this.createSession(userData);

      res.json({ error: false, content: {
        sessionId: session,
        username: userData.name,
      }});
    });
  }

  webSocketUpgrade(req: IncomingMessage, socket: Stream.Duplex, head: Buffer) {
    const sessionToken = req.headers['sec-websocket-protocol'];
    const userSession = this.sessions.find((session) => session[0] === sessionToken);
    if (!userSession) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wsConnMgr.upgradeConnection(req, socket, head, userSession[1]).then((conn) => {
      userSession[2] = conn;
    });
  }

  authMiddleware(req: Express.Request & any, res: Express.Response & any, next: () => void) {
    if (req.originalUrl === '/login' || req.originalUrl === '/register') return next();
    const sessionToken = req.header('Authorization');
    const userSession = this.sessions.find((session) => session[0] === sessionToken);
    if (!userSession) {
      res.status(403).json({ error: true, message: 'Invalid Session!'});
      return;
    }
    req.userInfo = userSession;
    next();
  }

  transcribe(req: Express.Request & any, res: Express.Response & any) {
    setTimeout(() => {
      this.wsConnMgr.sendCommandToConnection(req.userInfo[2], ECommands.ACK);
    }, 3000);
    const randomID = randomUUID();
    const transcriptionPath = path.resolve((req.userInfo[1] as IUser).folderPath, 'transcriptions', `${path.basename(req.file.path)}.srt`);
    const newTranscription: ITranscription = {
      videoId: randomID,
      srtFileName: transcriptionPath,
      name: req.body.name,
      ready: false,
    };

    res.status(200).json({ error: false, content: {
      name: newTranscription.name,
      preview: `Gerando transcrição`,
      id: newTranscription.videoId,
    } });

    this.dbManager.addTranscriptionToUser((req.userInfo[1] as IUser).id, newTranscription);

    const transcriptionProcess = spawn('whisper', [
      '--verbose',
      'True',
      '--model',
      'medium',
      '--task',
      req.body.translate ? 'translate' : 'transcribe',
      req.file.path,
      '--output_format',
      'srt',
      '--output_dir',
      path.resolve((req.userInfo[1] as IUser).folderPath, 'transcriptions'),
    ], {
      shell: true,
      stdio: 'overlapped'
    });

    transcriptionProcess.on('close', () => {
      console.log('finished');
      this.wsConnMgr.sendCommandToConnection(req.userInfo[2], ECommands.TranscriptionDone)
      this.dbManager.changeTranscriptionStatus((req.userInfo[1] as IUser).id, newTranscription.videoId, true);
      fs.unlinkSync(req.file.path);
    });
  }

  getTranscriptions(req: Express.Request & any, res: Express.Response & any) {
    const transcriptions = (JSON.parse(fs.readFileSync(path.resolve((req.userInfo[1] as IUser).folderPath, 'index.json')).toString()) as IUser).transcriptions;

    const resultData = transcriptions.map((transcription) => {
      return {
        ...transcription,
        srtFileName: '',
        preview: transcription.ready ? fs.readFileSync(transcription.srtFileName).toString().substring(0, 100) : 'Processando...',
      }
    });

    res.status(200).json({ error: false, content: resultData });
  }

  downloadTranscriptions(req: Express.Request & any, res: Express.Response & any) {
    const filename = req.params.filename;
    const transcriptionId = filename.split('.')[0];

    const transcriptions = (JSON.parse(fs.readFileSync(path.resolve((req.userInfo[1] as IUser).folderPath, 'index.json')).toString()) as IUser).transcriptions;
    const transcription = transcriptions.find((transcription) => transcription.videoId === transcriptionId);

    if (!transcription) return res.status(404).json({ error: true, message: 'No transcription found!' });

    res.status(200).send(fs.readFileSync(transcription.srtFileName));
  }

  deleteTranscription(req: Express.Request & any, res: Express.Response & any) {
    const filename = req.params.id;
    const transcriptionId = filename.split('.')[0];

    const transcriptions = (JSON.parse(fs.readFileSync(path.resolve((req.userInfo[1] as IUser).folderPath, 'index.json')).toString()) as IUser).transcriptions;
    const transcription = transcriptions.find((transcription) => transcription.videoId === transcriptionId);

    if (!transcription) return res.status(404).json({ error: true, message: 'No transcription found!' });

    this.dbManager.deleteTranscription((req.userInfo[1] as IUser).id, transcription.srtFileName);
    this.wsConnMgr.sendCommandToConnection(req.userInfo[2], ECommands.ACK);

    return res.status(200).json({ error: false, content: ''});
  }
}