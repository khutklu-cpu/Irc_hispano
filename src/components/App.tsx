import React from 'react';
import '../styles/App.css';

const CHAT_URL = 'https://chathispano.com/matrix/welcome';

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Chat Hispano</p>
          <h1>Acceso web funcional</h1>
          <p className="lead">
            Esta versión usa el acceso oficial de Chat Hispano para evitar los bloqueos de IP que impedían la conexión real desde hosts gratuitos genéricos.
          </p>
        </div>

        <div className="actions">
          <a className="primary-link" href={CHAT_URL} target="_blank" rel="noreferrer">
            Abrir en pestaña nueva
          </a>
        </div>
      </header>

      <main className="frame-wrap">
        <iframe
          title="Chat Hispano Oficial"
          className="chat-frame"
          src={CHAT_URL}
          allow="fullscreen"
        />
      </main>
    </div>
  );
};
