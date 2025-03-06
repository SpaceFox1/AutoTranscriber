'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import WebsocketHandler from './WebsocketHandler';

const WebsocketContext = createContext({
  socket: null as WebsocketHandler | null,
});

export function useWebSocContext() {
  return useContext(WebsocketContext);
}

export default function WebsocketProvider({ children, socket }: { children: ReactNode, socket: WebsocketHandler | null }) {
  return (
    <WebsocketContext.Provider value={{ socket }}>
      {children}
    </WebsocketContext.Provider>
  );
}