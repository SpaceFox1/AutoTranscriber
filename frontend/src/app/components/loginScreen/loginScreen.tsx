/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import styles from './loginScreen.module.css';
import { doLogin, doRegister } from './requestHandler';
import { useSessionContext } from '../providers/Session/SessionProvider';
import { useWebSocContext } from '../providers/Websocket/WebsocketProvider';

export default function LoginScreen({ hidden }: { hidden?: boolean }) {
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [registerEmail, setRegisterEmail] = useState<string>('');

  const [loginPassword, setLoginPassword] = useState<string>('');
  const [registerPassword, setRegisterPassword] = useState<string>('');

  const [registerName, setRegisterName] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [isRegister, setIsRegister] = useState<boolean>(false);

  const session = useSessionContext();
  const websocket = useWebSocContext();

  return (<div className={`${styles.loginScreen} ${hidden ? styles.hidden : ''}`} aria-hidden={hidden} inert={hidden}>
    <div className={styles.background} />
    <div className={`${styles.foreground} ${isRegister ? styles.toTheLeft : ''}`}>
      <h1>Login</h1>
      <div className={styles.inputBox}>
        <label htmlFor='emailInput'>Email</label>
        <input id="emailInput" className={styles.input} type='email' onInput={(e) => {setLoginEmail((e.target as any).value)}}/>
      </div>
      <div className={styles.inputBox}>
        <label htmlFor='passwordInput'>Senha</label>
        <input id="passwordInput" className={styles.input} type='password' onInput={(e) => {setLoginPassword((e.target as any).value)}}/>
      </div>
      {errorMsg ? <div className={styles.errorBox}>
        <span>{errorMsg}</span>
      </div> : null}
      <div className={styles.bottomOptions}>
        <button className={styles.link} onClick={() => {setIsRegister(true);}}>Não tem uma conta? Registre-se!</button>
        <button className={styles.button} onClick={async () => {
          const result = await doLogin(loginEmail, loginPassword) as any;
          if (result.error) {
            setErrorMsg(result.message);
          } else {
            setErrorMsg('');
            session?.setSession(result.content.sessionId, result.content.username);
            websocket.socket?.start(result.content.sessionId);
          }
        }}>Login</button>
      </div>
    </div>
    <div className={`${styles.foreground} ${isRegister ? '' : styles.toTheRight}`}>
      <h1>Registro</h1>
      <div className={styles.inputBox}>
        <label htmlFor='nameInput'>Nome</label>
        <input id="nameInput" className={styles.input} type='text' onInput={(e) => {setRegisterName((e.target as any).value)}}/>
      </div>
      <div className={styles.inputBox}>
        <label htmlFor='emailInput'>Email</label>
        <input id="emailInput" className={styles.input} type='email' onInput={(e) => {setRegisterEmail((e.target as any).value)}}/>
      </div>
      <div className={styles.inputBox}>
        <label htmlFor='passwordInput'>Senha</label>
        <input id="passwordInput" className={styles.input} type='password' onInput={(e) => {setRegisterPassword((e.target as any).value)}}/>
      </div>
      {errorMsg ? <div className={styles.errorBox}>
        <span>{errorMsg}</span>
      </div> : null}
      <div className={styles.bottomOptions}>
        <button className={styles.link} onClick={() => {setIsRegister(false);}}>Já tem uma conta? Faça Login!</button>
        <button className={styles.button} onClick={async () => {
          const result = await doRegister(registerName, registerEmail, registerPassword) as any;
          if (result.error) {
            setErrorMsg(result.message);
          } else {
            setErrorMsg('');
            session?.setSession(result.content.sessionId, result.content.username);
            websocket.socket?.start(result.content.sessionId);
          }
        }}>Registrar</button>
      </div>
    </div>
  </div>);
}