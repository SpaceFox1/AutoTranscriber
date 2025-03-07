'use client';
import { useSessionContext } from "./components/providers/Session/SessionProvider";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { deleteTranscription, downloadTranscription, getTranscriptionsList } from "./doRequests";
import { useWebSocContext } from "./components/providers/Websocket/WebsocketProvider";

export default function Home() {
  const [transcriptions, setTranscriptions] = useState<{
    videoId: string,
    name: string,
    preview: string,
    ready: boolean,
  }[]>([]);
  const session = useSessionContext();
  const websocket = useWebSocContext();
  
  useEffect(() => {
    if (session?.session.session === '') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getTranscriptionsList(session!.session.session).then((data: any) => {
      if (data.content)
      setTranscriptions(data.content.reverse());
    });

    const clear1 = websocket.socket?.on('TranscriptionDone', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getTranscriptionsList(session!.session.session).then((data: any) => {
        if (data.content)
        setTranscriptions(data.content.reverse());
      });
    });

    const clear2 = websocket.socket?.on('ACK', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getTranscriptionsList(session!.session.session).then((data: any) => {
        if (data.content)
        setTranscriptions(data.content.reverse());
      });
    });
    return () => {
      if (clear1) clear1();
      if (clear2) clear2();
    }
  }, [session, session?.session.session, websocket.socket]);

  return (
    <main className={styles.main}>
      <div className={styles.transcriptions}>
        {transcriptions.map((transcription, index) => {
          return <div key={'Transcription' + index} className={styles.transcription}>
            <h1>{transcription.name}</h1>
            <pre className={styles.preview}>{transcription.preview}</pre>
            <div className={styles.transcriptButtons}>
              <button className={styles.transcriptButton} onClick={() => {
                deleteTranscription(session!.session.session, transcription.videoId);
              }}>Deletar</button>
              <button className={styles.transcriptButton} onClick={() => {
                downloadTranscription(session!.session.session, transcription.videoId)
                .then((data) => {
                  const binaryData = Buffer.from((data as { image: string, name: string }).image);

                  const fileBase64 = URL.createObjectURL(
                    new Blob([binaryData.buffer], { type: "text/srt" })
                  );

                  const fileLink = document.createElement('a');
                  fileLink.href = fileBase64;

                  // suggest a name for the downloaded file
                  fileLink.download = 'Transcription.srt';

                  // simulate click
                  fileLink.click();
                });
              }}>Baixar</button>
            </div>
          </div>
        })}
      </div>
    </main>
  );
}
