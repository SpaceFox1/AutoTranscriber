import ITranscription from "./transcription";

export default interface IUser {
  id: string,
  name: string,
  email: string,
  passwordHash: string,
  transcriptions: ITranscription[],
  folderPath: string,
}