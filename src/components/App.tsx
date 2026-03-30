import React, { useState, useEffect, useRef } from 'react';
import { useIRCStore } from '../services/store';
import { ircService } from '../services/ircService';
import '../styles/App.css';

interface MessageProps {
  timestamp: Date;
  nickname: string;
  content: string;
  type: string;
}

const MessageComponent: React.FC<MessageProps> = ({ timestamp, nickname, content, type }) => {
  const timeString = timestamp.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  
  if (type === 'system') {
    return <div className="message system-message">* {content}</div>;
  }
  
  if (type === 'action') {
    return <div className="message action-message">* {nickname} {content}</div>;
  }

  return (
    <div className="message">
      <span className="timestamp">{timeString}</span>
      <span className="nickname">{nickname}</span>
      <span className="content">{content}</span>
    </div>
  );
};

export const App: React.FC = () => {
  const {
    connected,
    nickname,
    channels,
    privateChats,
    currentTab,
    messages,
    error,
    setConnected,
    setNickname,
    addChannel,
    removeChannel,
    setCurrentTab,
    addMessage,
    sendMessage,
    joinChannel,
    leaveChannel,
    openPrivate,
    setError
  } = useIRCStore();

  const [inputValue, setInputValue] = useState('');
  const [connectionNickname, setConnectionNickname] = useState('Usuario_' + Math.floor(Math.random() * 10000));
  const [newChannelName, setNewChannelName] = useState('');
  const [userListExpanded, setUserListExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnect = async () => {
    try {
      setNickname(connectionNickname);
      await ircService.connect(connectionNickname);
      
      // Agregar canales por defecto
      addChannel('#hispano');
      addChannel('#general');
      setCurrentTab('#hispano');
      setConnected(true);
      setError(null);
      
      const systemMsg = {
        timestamp: new Date(),
        nickname: 'SYSTEM',
        content: `Bienvenido a IRC Hispano, ${connectionNickname}. Conectado a irc.irc-hispano.org`,
        type: 'system' as const,
        channel: 'home'
      };
      addMessage(systemMsg);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoinChannel = () => {
    if (newChannelName.trim()) {
      let channelName = newChannelName.trim();
      if (!channelName.startsWith('#')) {
        channelName = '#' + channelName;
      }
      joinChannel(channelName);
      setNewChannelName('');
    }
  };

  const handleLeaveChannel = (channelName: string) => {
    leaveChannel(channelName);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      const input = inputValue.trim();

      // Procesar comandos
      if (input.startsWith('/')) {
        handleCommand(input);
      } else {
        sendMessage(currentTab, input);
        const msg = {
          timestamp: new Date(),
          nickname: nickname,
          content: input,
          type: 'privmsg' as const,
          channel: currentTab
        };
        addMessage(msg);
      }
      setInputValue('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/join':
      case '/j':
        if (parts[1]) {
          let channelName = parts[1];
          if (!channelName.startsWith('#')) {
            channelName = '#' + channelName;
          }
          joinChannel(channelName);
        }
        break;
      case '/part':
      case '/leave':
        handleLeaveChannel(currentTab);
        break;
      case '/nick':
        if (parts[1]) {
          const newNick = parts[1];
          setNickname(newNick);
          const msg = {
            timestamp: new Date(),
            nickname: 'SYSTEM',
            content: `Cambió nickname a ${newNick}`,
            type: 'system' as const,
            channel: currentTab
          };
          addMessage(msg);
        }
        break;
      case '/me':
        const action = parts.slice(1).join(' ');
        if (action) {
          ircService.sendAction(currentTab, action);
          const msg = {
            timestamp: new Date(),
            nickname: nickname,
            content: action,
            type: 'action' as const,
            channel: currentTab
          };
          addMessage(msg);
        }
        break;
      case '/clear':
        // Limpiar mensajes del canal actual
        break;
      case '/help':
        showHelp();
        break;
      case '/quit':
      case '/exit':
        handleDisconnect();
        break;
      default:
        setError(`Comando desconocido: ${cmd}`);
    }
  };

  const showHelp = () => {
    const helpMsg = `
Comandos disponibles:
/join #canal - Unirse a un canal
/part - Salir del canal actual
/nick nuevo_nick - Cambiar nickname
/me acción - Enviar una acción
/clear - Limpiar mensajes
/help - Mostrar esta ayuda
/quit - Desconectar
    `.trim();
    const msg = {
      timestamp: new Date(),
      nickname: 'HELP',
      content: helpMsg,
      type: 'system' as const,
      channel: currentTab
    };
    addMessage(msg);
  };

  const handleOpenPrivate = () => {
    const privateName = prompt('Nombre del usuario:');
    if (privateName && privateName.trim()) {
      openPrivate(privateName.trim());
    }
  };

  const handleDisconnect = () => {
    ircService.disconnect();
    setConnected(false);
    setError(null);
  };

  const getTabMessages = () => {
    return messages.filter(msg => msg.channel === currentTab);
  };

  const getChannelUsers = (): string[] => {
    if (currentTab.startsWith('#')) {
      return ['ChanServ', 'NickServ', 'OperServ', 'Juan', 'Maria', 'Pedro', 'Ana', 'Luis'];
    }
    return [];
  };

  if (!connected) {
    return (
      <div className="login-screen">
        <div className="login-box">
          <h1>IRC HISPANO</h1>
          <p className="subtitle">Cliente IRC para irc.irc-hispano.org</p>
          <div className="login-form">
            <div className="form-group">
              <label>Nickname:</label>
              <input
                type="text"
                value={connectionNickname}
                onChange={(e) => setConnectionNickname(e.target.value.substring(0, 30))}
                placeholder="Tu nickname (máx 30 caracteres)"
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
            <button onClick={handleConnect} className="btn btn-primary">
              Conectar
            </button>
            {error && <div className="error-message">{error}</div>}
            <div className="login-footer">
              <p>Cliente IRC moderno</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>IRC HISPANO</h1>
        </div>
        <div className="header-center">
          <span className="server-info">irc.irc-hispano.org</span>
        </div>
        <div className="header-right">
          <span>Usuario: <strong>{nickname}</strong></span>
          <span className="status-connected">● Conectado</span>
          <button onClick={handleDisconnect} className="btn-disconnect">Desconectar</button>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Canales ({channels.size})</h3>
            <div className="channel-list">
              {Array.from(channels.keys()).map(channelName => (
                <div
                  key={channelName}
                  className={`channel-item ${currentTab === channelName ? 'active' : ''}`}
                  onClick={() => setCurrentTab(channelName)}
                >
                  <span className="channel-name">{channelName}</span>
                  <button
                    className="close-btn"
                    title="Salir del canal"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveChannel(channelName);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="join-channel">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Ej: #hispano"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinChannel()}
              />
              <button onClick={handleJoinChannel} className="btn-small">
                Unirse
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Privados ({privateChats.size})</h3>
            <button onClick={handleOpenPrivate} className="btn btn-secondary">
              + Nuevo privado
            </button>
            <div className="private-list">
              {Array.from(privateChats.keys()).map(nick => (
                <div
                  key={nick}
                  className={`private-item ${currentTab === `@${nick}` ? 'active' : ''}`}
                  onClick={() => setCurrentTab(`@${nick}`)}
                >
                  {nick}
                </div>
              ))}
            </div>
          </div>

          {currentTab.startsWith('#') && (
            <div className="sidebar-section users-section">
              <h3 onClick={() => setUserListExpanded(!userListExpanded)} style={{ cursor: 'pointer' }}>
                Usuarios {userListExpanded ? '▼' : '▶'}
              </h3>
              {userListExpanded && (
                <div className="user-list">
                  {getChannelUsers().map(user => (
                    <div key={user} className="user-item" onClick={() => openPrivate(user)}>
                      <span className="user-mode">@</span>
                      <span className="user-name">{user}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <main className="chat-area">
          <div className="chat-header">
            <h2>{currentTab}</h2>
            {currentTab.startsWith('#') && (
              <div className="chat-header-info">
                <span>{getChannelUsers().length} usuarios</span>
              </div>
            )}
          </div>

          <div className="messages-container">
            {getTabMessages().length === 0 ? (
              <div className="no-messages">
                <p>No hay mensajes en {currentTab}</p>
                <p className="help-text">Escribe algo para comenzar</p>
              </div>
            ) : (
              getTabMessages().map((msg, idx) => (
                <MessageComponent
                  key={idx}
                  timestamp={msg.timestamp}
                  nickname={msg.nickname}
                  content={msg.content}
                  type={msg.type}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="message-input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe un mensaje (/help para comandos)..."
              className="message-input"
              maxLength={512}
            />
            <button type="submit" className="btn btn-primary">
              Enviar
            </button>
          </form>
        </main>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} title="Cerrar">×</button>
        </div>
      )}
    </div>
  );
};
