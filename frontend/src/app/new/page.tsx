'use client';

import { uploadTranscriptionForm } from '../doRequests';
import { NewTranscriptionPageUI } from './UI';

export default function NewTranscriptionPage() {
  return <NewTranscriptionPageUI uploadForm={uploadTranscriptionForm}/>
}