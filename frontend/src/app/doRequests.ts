'use server';

import { redirect } from "next/navigation";

const backendURL = 'http://localhost:3010';

async function doRequest(path: string, sessionToken: string, method: 'GET' | 'POST' | 'DELETE', data?: string) {
  return new Promise((resolve) => {
    fetch(`${backendURL}/${path}`, {
      cache: 'no-store',
      method: method,
      body: data,
      headers: {
        'Authorization': sessionToken,
      }
    }).then((res) => res.json()).then((data) => resolve(data));
  });
}

export async function getTranscriptionsList(sessionToken: string) {
  return doRequest('transcriptions', sessionToken, 'GET');
}

export async function downloadTranscription(sessionToken: string, transcriptionId: string) {
  return new Promise((resolve) => {
    fetch(`${backendURL}/downloadTranscriptions/${transcriptionId}.srt`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': sessionToken,
      }
    })
    .then( (res) => res.blob() )
    .then(async (data) => {
      const object = {
        image: Array.from(new Uint8Array(await data.arrayBuffer())),
        name: "transcription",
      };
    
      resolve(object);
    });
  });
}

export async function uploadTranscriptionForm(sessionToken: string, formdata: FormData) {
  await fetch(`${backendURL}/transcribe`, {
    method: 'POST',
    cache: 'no-store',
    body: formdata,
    headers: {
      'Authorization': sessionToken,
    }
  });
  redirect('/');
}

export async function deleteTranscription(sessionToken: string, transcriptionId: string) {
  return doRequest('transcriptions/'+transcriptionId, sessionToken, 'DELETE');
}