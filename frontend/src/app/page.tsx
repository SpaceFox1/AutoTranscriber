'use client';
import { useSessionContext } from "./components/providers/Session/SessionProvider";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { getTranscriptionsList } from "./doRequests";

export default function Home() {
  const [transcriptions, setTranscriptions] = useState<{
    name: string,
    preview: string,
    id: string,
  }[]>([]);
  const session = useSessionContext();
  
  useEffect(() => {
    if (session?.session.session === '') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTranscriptionsList(session!.session.session).then((data: any) => {
      setTranscriptions(data.content);
    })
  }, [session, session?.session.session]);

  return (
    <main className={styles.main}>
      <div>
        {transcriptions.map((transcription, index) => {
          return <div key={'Transcription' + index} className={styles.transcription}>
            <h1>{transcription.name}</h1>
          </div>
        })}
      </div>
    </main>
  );
}
