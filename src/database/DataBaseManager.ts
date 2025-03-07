import fs from 'fs';
import path from 'path';
import IUser from '../interfaces/user';
import { randomUUID } from 'crypto';
import ITranscription from '../interfaces/transcription';

interface userRegistryItem {
  id: string,
  email: string,
}

export default class DataBaseManager {
  private databaseFolder = path.resolve(__dirname, '..', '..', 'database');
  private userRegistry = path.resolve(this.databaseFolder, 'userRegistry.json');
  constructor() {
    if (!fs.existsSync(this.databaseFolder)) fs.mkdirSync(this.databaseFolder);
    if (!fs.existsSync(this.userRegistry)) fs.writeFileSync(this.userRegistry, '[]');
  }

  private loadUserRegistry(): userRegistryItem[] {
    return JSON.parse(fs.readFileSync(this.userRegistry).toString());
  }

  private updateUserRegistry(newUserRegistry: userRegistryItem[]) {
    fs.writeFileSync(this.userRegistry, JSON.stringify(newUserRegistry));
  }

  private appendToUserRegistry(userData: userRegistryItem) {
    const userRegistry = this.loadUserRegistry();
    userRegistry.push(userData);
    this.updateUserRegistry(userRegistry);
  }

  createUser(user: Omit<Omit<Omit<IUser, 'transcriptions'>, 'id'>, 'folderPath'>) {
    const userObj: IUser = {
      id: randomUUID(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      transcriptions: [],
      folderPath: '',
    };

    const usrFolder = path.resolve(this.databaseFolder, userObj.id);
    fs.mkdirSync(usrFolder);
    fs.mkdirSync(path.resolve(usrFolder, 'transcriptions'));
    userObj.folderPath = usrFolder;

    fs.writeFileSync(path.resolve(usrFolder, 'index.json'), JSON.stringify(userObj));


    this.appendToUserRegistry({
      id: userObj.id,
      email: userObj.email,
    });
    return userObj;
  }

  getUser(userId: string) {
    if (!fs.existsSync(path.resolve(this.databaseFolder, userId))) return;
    const userData: IUser = JSON.parse(fs.readFileSync(path.resolve(this.databaseFolder, userId, 'index.json')).toString());
    return userData;
  }

  findUser(email: string) {
    const usrRegistry = this.loadUserRegistry();
    const user = usrRegistry.find((item) => item.email === email);
    if (!user) return;
    return this.getUser(user.id);
  }

  private updateUser(userObj: IUser) {
    fs.writeFileSync(path.resolve(this.databaseFolder, userObj.id, 'index.json'), JSON.stringify(userObj));
  }

  deleteUser(userId: string) {
    const userRegistry = this.loadUserRegistry();
    const userRIndex = userRegistry.findIndex((item) => item.id === userId);
    if (userRIndex < 0) return;

    userRegistry.splice(userRIndex, 1);
    this.updateUserRegistry(userRegistry);

    fs.unlinkSync(path.resolve(this.databaseFolder, userId));
  }

  addTranscriptionToUser(userId: string, transcription: ITranscription) {
    const userObj = this.getUser(userId);

    if (!userObj) return;

    userObj.transcriptions.push(transcription);
    this.updateUser(userObj);
  }

  deleteTranscription(userId: string, fileName: string) {
    const userData = this.getUser(userId);
    if (!userData) return;

    const filePath = path.resolve(this.databaseFolder, userId, 'transcriptions', fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const fileIndex = userData.transcriptions.findIndex((item) => item.srtFileName === fileName);
    userData.transcriptions.splice(fileIndex, 1);
    this.updateUser(userData);
  }

  changeTranscriptionStatus(userId: string, transcriptionId: string, status: boolean) {
    const userData = this.getUser(userId);
    if (!userData) return;
    
    const transcriptI = userData.transcriptions.findIndex((transcription) => transcription.videoId === transcriptionId);
    if (transcriptI < 0) return;

    userData.transcriptions[transcriptI].ready = status;

    fs.writeFileSync(path.resolve(userData.folderPath, 'index.json'), JSON.stringify(userData));
  }
}