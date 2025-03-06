const backendWebsocketPort = 3010;

export enum ESocketStatus {
  'connected',
  'disconnected',
  'connecting',
}

let instance: WebsocketHandler | null = null;

export default class WebsocketHandler {
  private socket: WebSocket | null = null;
  private eventQueue: { eventName: string, callback: (data: unknown) => void }[] = [];
  private socketReady: boolean = false;
  private maxRetryAttempts = 5;
  private retryAttempts = 0;
  private retryInterval: NodeJS.Timeout | null = null;
  public status: ESocketStatus = ESocketStatus.disconnected;
  statusChangeObservers: ((newStatus: ESocketStatus) => void)[] = [];

  constructor() {
    if (instance) return instance;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    instance = this;
  }

  public on(event: string, callback: (data: unknown) => void): () => void {
    const callbackIndex = this.eventQueue.push({ eventName: event, callback });
    return () => {
      this.eventQueue.splice(callbackIndex);
    }
  }

  public whenStatusChange(callback: (newStatus: ESocketStatus) => void): () => void {
    callback(this.status);
    const callbackIndex = this.statusChangeObservers.push(callback);
    return () => {
      this.statusChangeObservers.splice(callbackIndex);
    };
  }

  public changeStatus(newStatus: ESocketStatus) {
    this.status = newStatus;
    this.statusChangeObservers.forEach((observer) => {
      observer(this.status);
    });
  }

  public emit(eventName: string, data: string) {
    this.eventQueue.forEach((queueItem) => {
      if (queueItem.eventName === eventName) {
        queueItem.callback(data);
      }
    });
  }

  public start(sessionToken: string): void {
    if (this.status === ESocketStatus.disconnected) {
      this.changeStatus(ESocketStatus.connecting);
      this.socket = new WebSocket('http://localhost:' + backendWebsocketPort, sessionToken);

      this.socket.addEventListener('open', () => {
        this.socketReady = true;
        this.retryAttempts = 0;
        this.changeStatus(ESocketStatus.connected);
        console.log('connected');
      });

      this.socket.addEventListener('message', (rawEvent) => {
        if (rawEvent.data.toString() === 'ping') {
          this.socket?.send('pong');
          return;
        }
        const event = JSON.parse(rawEvent.data);
        console.log(event);
        this.emit(event.event, event.data);
      });

      this.socket.addEventListener('close', () => {
        this.socketReady = false;
        this.changeStatus(ESocketStatus.disconnected);
        console.log('disconnected');
        this.socket = null;
        if (this.retryAttempts >= this.maxRetryAttempts) {
          if (this.retryInterval) clearInterval(this.retryInterval);
          this.emit('maxRetryReach', '');
          return console.error('Reached maximum amount of retry attempts!');
        }
        if (!this.retryInterval) {
          this.retryInterval = setInterval(() => {
            this.retryAttempts++;
            this.start(sessionToken);
          }, 5000);
        }
      });
    }
  }

  public stop(): void {
    this.socketReady = false;
    this.changeStatus(ESocketStatus.disconnected);
    this.socket?.close();
  }

  public sendEvent(event: string, ...params: unknown[]): void {
    if (this.socketReady) {
      this.socket?.send(JSON.stringify({ event, data: params }));
    }
  }
}