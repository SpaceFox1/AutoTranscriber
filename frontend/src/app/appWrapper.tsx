'use client';

import WebsocketProvider from "./components/providers/Websocket/WebsocketProvider";
import WebsocketHandler from "./components/providers/Websocket/WebsocketHandler";
import SessionProvider from "./components/providers/Session/SessionProvider";
import { useState } from "react";
import LoginScreen from "./components/loginScreen/loginScreen";
import styles from './page.module.css';
import Link from "next/link";

export default function AppWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<{session: string, username: string}>({session: '', username: ''});
  const websocketHandler = new WebsocketHandler();
  websocketHandler.on('maxRetryReach', () => {
    setSession({ session: '', username: ''});
  });
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider sessionState={{
          session,
          setSession: (session: string, username: string) => { setSession({session: session, username: username }); }
        }}>
          <WebsocketProvider socket={websocketHandler}>
            <LoginScreen hidden={session.session !== ''} />
            <div className={styles.content}>
              <header className={styles.header}>
                <div className={styles.left}>
                  <Link href="/"><h1>AutoTranscriber</h1></Link>
                </div>
                <div className={styles.right}>
                  <Link href='/new' className={styles.button}>Criar</Link>
                  <b>Olá {session.username}!</b>
                  <button className={styles.link} onClick={() => {
                    websocketHandler.stop();
                    setSession({ session: '', username: '' });
                  }}>LogOut</button>
                </div>
              </header>
              {children}
            </div>
          </WebsocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
