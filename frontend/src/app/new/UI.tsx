'use client';

import { useSessionContext } from '../components/providers/Session/SessionProvider';
import styles from './new.module.css';
import { useEffect, useRef, useState } from "react";

export function NewTranscriptionPageUI({ uploadForm }: { uploadForm: (sessionToken: string, formData: FormData) => void }) {
  const [transcriptionName, setTranscriptionName] = useState<string>('');
  const [validInput, setValidInput] = useState<boolean>(false);
  
  const fileInput = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    function onSelectFile() {
      if (window.FileReader && window.Blob) {
        const files = fileInput.current?.files;
        if (files && (files[0].type.match('video/*') || files[0].type.match('audio/*'))) return setValidInput(true);
      }
      setValidInput(false);
    }

    fileInput.current?.addEventListener('change', onSelectFile);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fileInput.current?.removeEventListener('change', onSelectFile);
    }
  }, [fileInput]);

  const session = useSessionContext();

  return <main className={styles.newForm}>
    <form className={styles.form} action={uploadForm.bind(null, session!.session.session)}>
      <h1>Nova Transcrição</h1>
      <div className={styles.inputField}>
        <label htmlFor='TranscriptionName'>Nome da Transcrição</label>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <input name='name' required type='text' id='TranscriptionName' className={styles.inputElem} onInput={(e) => {setTranscriptionName((e.target as any).value)}}/>
      </div>
      <div className={styles.inputField}>
        <label htmlFor='TranscriptionFile'>Subir Vídeo</label>
        <input name='file' required type='file' id='TranscriptionFile' className={styles.inputElem} accept="video/*,audio/*" ref={fileInput} />
      </div>
      <div className={styles.inputFieldRow}>
        <input name='translate' type='checkbox' id='TranscriptionLang' className={styles.inputElem}/>
        <label htmlFor='TranscriptionLang'>Traduzir para inglês</label>
      </div>
      <input type='submit' className={styles.button} disabled={!validInput || transcriptionName === ''} value={'Transcrever'} />
    </form>
  </main>
}