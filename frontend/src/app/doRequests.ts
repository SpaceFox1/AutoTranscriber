'use server';

import { redirect } from "next/navigation";

const backendURL = 'http://localhost:3010';

async function doRequest(path: string, sessionToken: string, method: 'GET' | 'POST' | 'DELETE', data?: string) {
  return new Promise((resolve) => {
    fetch(`${backendURL}/${path}`, {
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

export async function uploadTranscriptionForm(sessionToken: string, formdata: FormData) {
  return new Promise((resolve) => {
    fetch(`${backendURL}/transcribe`, {
      method: 'POST',
      body: formdata,
      headers: {
        'Authorization': sessionToken,
      }
    }).then((data) => data.json()).then((result) => {
      resolve(redirect(`/transcription/${result.content.id}`));
    });
  });
}