'use client';

import React, { createContext, useContext, ReactNode } from 'react';

const SessionContext = createContext<{
  session: {
    session: string,
    username: string,
  }
  setSession: (session: string, username: string) => void
} | null>(null);

export function useSessionContext() {
  return useContext(SessionContext);
}

export default function SessionProvider({ children, sessionState }: { children: ReactNode, sessionState: {
  session: {
    session: string,
    username: string,
  },
  setSession: (session: string, username: string) => void
} }) {
  return (
    <SessionContext.Provider value={sessionState}>
      {children}
    </SessionContext.Provider>
  );
}