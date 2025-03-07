import { Server as WebsocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Duplex, EventEmitter } from "stream";
import IUser from "../interfaces/user";

export enum ECommands {
  TranscriptionDone='TranscriptionDone',
  ACK='ACK',
}

interface ICommand {
  command: ECommands,
  data?: unknown,
}

export default class ConnectionManager {
  private server: WebsocketServer;
  private pingLoop: NodeJS.Timeout;
  private hearts: Map<WebSocket, boolean> = new Map();
  constructor() {
    this.server = new WebsocketServer({ noServer: true });

    this.server.on('connection', this.onConnection.bind(this));
    this.server.on('close', this.onConnectionClose.bind(this));

    this.pingLoop = setInterval(() => {
      this.server.clients.forEach((client) => {
        if (!this.hearts.get(client)) {
          this.hearts.delete(client);
          return client.terminate();
        }

        this.hearts.set(client, false);
        client.send('ping');
      });
    }, 5000);
  }

  public async upgradeConnection(req: IncomingMessage, socket: Duplex, head: Buffer, userData: IUser): Promise<WebSocket> {
    return new Promise((resolve) => {
      this.server.handleUpgrade(req, socket, head, (ws) => {
        this.server.emit('connection', ws, req, userData);
        return resolve(ws);
      });
    });
  }

  sendCommandToConnection(conn: WebSocket, command: ECommands, data?: unknown) {
    const content = {
      event: command.toString(),
    };
    if (data) Object.assign(content, { data });
    if (conn)
    conn.send(JSON.stringify(content));
  }

  private parseMessage(dataString: string): ICommand | null {
    let dataObj;
    try {
      dataObj = JSON.parse(dataString);
    } catch {
      return null;
    }

    if (typeof(dataObj.command) !== 'string') return null;

    return {
      command: dataObj.command,
      data: dataObj.data,
    }
  }

  private commandHandler(conn: WebSocket, command: ICommand, userData: IUser) {
  
  }

  private onConnection(conn: WebSocket, _: IncomingMessage, userData: IUser) {
    conn.on('message', (dataBuffer) => {
      if (dataBuffer.toString() === 'pong') {
        this.hearts.set(conn, true);
        return;
      }
      const command = this.parseMessage(dataBuffer.toString());
      if (command) this.commandHandler(conn, command, userData);
    });

    this.hearts.set(conn, true);
  }

  private onConnectionClose() {
    this.hearts.clear();
    clearInterval(this.pingLoop);
  }
}