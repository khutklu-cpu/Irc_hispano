import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClientEvent,
  EventType,
  MatrixClient,
  MsgType,
  Room,
  RoomEvent,
  RoomMember,
  RoomMemberEvent,
  createClient,
} from 'matrix-js-sdk';
import { IRCService } from '../services/ircService';
import type { Message as IRCTextMessage, UserInfo as IRCUserInfo } from '../types/irc';
import '../styles/App.css';

const BASE_URL = 'https://whatisthematrix.chathispano.com';
const SERVER_NAME = 'chathispano.org';
const SESSION_KEY = 'chat-hispano-matrix-session';

type SessionData = {
  accessToken: string;
  userId: string;
  deviceId?: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  timestamp: number;
  own: boolean;
};

function normalizeUser(input: string): string {
  const value = input.trim();
  if (!value) return value;
  if (value.startsWith('@')) return value;
  return `@${value}:${SERVER_NAME}`;
}

function createMatrixClient(session?: SessionData): MatrixClient {
  return createClient({
    baseUrl: BASE_URL,
    accessToken: session?.accessToken,
    userId: session?.userId,
    deviceId: session?.deviceId,
  });
}

function formatSender(sender?: string | null): string {
  if (!sender) return 'desconocido';
  const clean = sender.startsWith('@') ? sender.slice(1) : sender;
  return clean.split(':')[0] || clean;
}

function roomLabel(room: Room): string {
  return room.name || room.getCanonicalAlias() || room.roomId;
}

function roomMessages(room: Room, userId?: string): ChatMessage[] {
  return room
    .getLiveTimeline()
    .getEvents()
    .filter((event) => event.getType() === EventType.RoomMessage)
    .map((event) => {
      const content = event.getContent<Record<string, unknown>>();
      const body = typeof content.body === 'string' ? content.body : '';
      return {
        id: event.getId() || `${event.getTs()}-${event.getSender()}`,
        sender: formatSender(event.getSender()),
        body,
        timestamp: event.getTs(),
        own: event.getSender() === userId,
      };
    });
}

export const App: React.FC = () => {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('Conecta con tu cuenta de Chat Hispano.');
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [draft, setDraft] = useState('');
  const [joinTarget, setJoinTarget] = useState('');
  const [tick, setTick] = useState(0);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestViewOpen, setGuestViewOpen] = useState(false);
  const [guestConnected, setGuestConnected] = useState(false);
  const [guestConnecting, setGuestConnecting] = useState(false);
  const [guestNickname, setGuestNickname] = useState('');
  const [guestChannels, setGuestChannels] = useState<string[]>([]);
  const [guestSelectedChannel, setGuestSelectedChannel] = useState('');
  const [guestJoinTarget, setGuestJoinTarget] = useState('');
  const [guestDraft, setGuestDraft] = useState('');
  const [guestStatus, setGuestStatus] = useState('Acceso invitado por IRC.');
  const [guestError, setGuestError] = useState('');
  const [guestTick, setGuestTick] = useState(0);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const guestServiceRef = useRef<IRCService | null>(null);
  const guestCleanupRef = useRef<Array<() => void>>([]);

  // Quitar loading screen cuando el componente se monta
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__hideLoading) {
      window.__hideLoading();
    }
    
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) {
      setSessionReady(true);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as SessionData;
      const restored = createMatrixClient(parsed);
      setClient(restored);
      setUserId(parsed.userId);
      setStatus('Recuperando sesion...');
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!client) return;

    let disposed = false;

    const refresh = () => {
      if (disposed) return;
      const nextRooms = client
        .getRooms()
        .filter((room) => room.getMyMembership() === 'join')
        .sort((left, right) => right.getLastActiveTimestamp() - left.getLastActiveTimestamp());

      setRooms(nextRooms);
      setSelectedRoomId((current) => {
        if (current && nextRooms.some((room) => room.roomId === current)) {
          return current;
        }
        return nextRooms[0]?.roomId || '';
      });
      setTick((value) => value + 1);
    };

    const onSync = (state: string) => {
      if (state === 'PREPARED') {
        setStatus('Conectado.');
        setError('');
        setSessionReady(true);
        refresh();
      }

      if (state === 'ERROR') {
        setError('Fallo al sincronizar con el servidor Matrix.');
      }
    };

    const onTimeline = () => refresh();
    const onRoom = () => refresh();
    const onMember = () => refresh();

    client.on(ClientEvent.Sync, onSync);
    client.on(RoomEvent.Timeline, onTimeline);
    client.on(ClientEvent.Room, onRoom);
    client.on(RoomMemberEvent.Membership, onMember);
    client.startClient({ initialSyncLimit: 30 });
    refresh();

    return () => {
      disposed = true;
      client.off(ClientEvent.Sync, onSync);
      client.off(RoomEvent.Timeline, onTimeline);
      client.off(ClientEvent.Room, onRoom);
      client.off(RoomMemberEvent.Membership, onMember);
      client.stopClient();
    };
  }, [client]);

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedRoomId, tick, guestSelectedChannel, guestTick]);

  useEffect(() => {
    return () => {
      guestCleanupRef.current.forEach((cleanup) => cleanup());
      guestCleanupRef.current = [];
      guestServiceRef.current?.disconnect();
      guestServiceRef.current = null;
    };
  }, []);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const messages = useMemo(
    () => (selectedRoom ? roomMessages(selectedRoom, client?.getUserId() || undefined) : []),
    [selectedRoom, client, tick],
  );

  const members = useMemo(() => {
    if (!selectedRoom) return [] as RoomMember[];
    return selectedRoom
      .getJoinedMembers()
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [selectedRoom, tick]);

  const guestMessages = useMemo(() => {
    if (!guestSelectedChannel || !guestServiceRef.current) return [] as IRCTextMessage[];
    return guestServiceRef.current.getChannelMessages(guestSelectedChannel);
  }, [guestSelectedChannel, guestTick]);

  const guestUsers = useMemo(() => {
    if (!guestSelectedChannel || !guestServiceRef.current) return [] as IRCUserInfo[];
    return guestServiceRef.current
      .getChannelUsers(guestSelectedChannel)
      .sort((left, right) => left.nickname.localeCompare(right.nickname));
  }, [guestSelectedChannel, guestTick]);

  const guestTimeline = useMemo(
    () => guestMessages.map((message, index) => ({
      id: `${message.timestamp.getTime()}-${message.nickname}-${index}`,
      sender: message.nickname === 'SYSTEM' ? 'sistema' : message.nickname,
      body: message.content,
      timestamp: message.timestamp.getTime(),
      own: message.nickname === guestNickname,
    })),
    [guestMessages, guestNickname],
  );

  function ensureGuestService(): IRCService {
    if (guestServiceRef.current) {
      return guestServiceRef.current;
    }

    const service = new IRCService();
    guestServiceRef.current = service;
    guestCleanupRef.current = [
      service.onMessage(() => {
        setGuestTick((value) => value + 1);
      }),
      service.onStateChange((state) => {
        setGuestConnected(state.connected);
        setGuestNickname(service.getNickname());
        setGuestChannels(service.getChannels());
        setGuestSelectedChannel((current) => {
          const nextChannels = service.getChannels();
          if (current && nextChannels.includes(current)) {
            return current;
          }
          return nextChannels[0] || '';
        });
        if (state.status) {
          setGuestStatus(state.status);
        }
        if (state.error) {
          setGuestError(state.error);
        }
        setGuestTick((value) => value + 1);
      }),
    ];

    return service;
  }

  function closeGuestView() {
    guestCleanupRef.current.forEach((cleanup) => cleanup());
    guestCleanupRef.current = [];
    guestServiceRef.current?.disconnect();
    guestServiceRef.current = null;
    setGuestViewOpen(false);
    setGuestConnected(false);
    setGuestNickname('');
    setGuestChannels([]);
    setGuestSelectedChannel('');
    setGuestJoinTarget('');
    setGuestDraft('');
    setGuestStatus('Acceso invitado por IRC.');
    setGuestError('');
    setIsGuestMode(false);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('Autenticando...');

    try {
      const loginClient = createMatrixClient();
      const response = await loginClient.login('m.login.password', {
        identifier: {
          type: 'm.id.user',
          user: normalizeUser(userId),
        },
        password,
        initial_device_display_name: 'Cliente propio Chat Hispano',
      });

      const session: SessionData = {
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUserId(response.user_id);
      setPassword('');
      setClient(createMatrixClient(session));
      setStatus('Autenticado. Sincronizando salas...');
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesion';
      setError(message);
      setStatus('No conectado.');
      setSessionReady(true);
    }
  }

  async function handleJoinRoom(event: React.FormEvent) {
    event.preventDefault();
    if (!client || !joinTarget.trim()) return;

    setError('');
    try {
      const room = await client.joinRoom(joinTarget.trim());
      setJoinTarget('');
      setSelectedRoomId(room.roomId);
      setStatus(`Unido a ${roomLabel(room)}.`);
      setTick((value) => value + 1);
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : 'No se pudo unir a la sala';
      setError(message);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!client || !selectedRoom || !draft.trim()) return;

    const body = draft.trim();
    setDraft('');

    try {
      await client.sendEvent(
        selectedRoom.roomId,
        EventType.RoomMessage,
        {
          msgtype: MsgType.Text,
          body,
        },
        '',
      );
      setTick((value) => value + 1);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje';
      setError(message);
      setDraft(body);
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    client?.stopClient();
    setClient(null);
    setRooms([]);
    setSelectedRoomId('');
    setDraft('');
    setJoinTarget('');
    setError('');
    setStatus('Sesion cerrada.');
  }

  async function handleGuestLogin() {
    // Solo abre la UI sin conectar
    setError('');
    setGuestError('');
    setGuestStatus('Listo para conectar. Ingresa un canal y presiona "Unir".');
    setGuestViewOpen(true);
    setSessionReady(true);
    setIsGuestMode(true);
    
    const nextNickname = IRCService.generateGuestNick();
    setGuestNickname(nextNickname);
    
    console.log('[GUEST] UI abierta con nick:', nextNickname);
  }

  async function handleGuestJoinRoom(event: React.FormEvent) {
    event.preventDefault();
    
    const service = ensureGuestService();
    if (!guestJoinTarget.trim()) {
      setGuestError('Por favor ingresa un canal (ej: #hispano)');
      return;
    }

    // Si no está conectado, conectar primero
    if (!guestConnected && !guestConnecting) {
      setGuestConnecting(true);
      setGuestError('');
      setGuestStatus('Conectando al IRC de Chat Hispano...');
      
      try {
        console.log('[GUEST] Iniciando conexión con nick:', guestNickname);
        await service.connect(guestNickname, guestNickname, 'Invitado web de Chat Hispano');
        console.log('[GUEST] Conexión exitosa');
        setGuestConnected(true);
        setGuestStatus('Conectado al IRC de Chat Hispano.');
        setGuestError('');
        setGuestConnecting(false);
        
        // Ahora unirse al canal
        const channelToJoin = guestJoinTarget.trim();
        setGuestJoinTarget('');
        service.joinChannel(channelToJoin);
        
      } catch (connectError) {
        const message = connectError instanceof Error ? connectError.message : 'No se pudo conectar al IRC';
        console.error('[GUEST] Error de conexión:', message);
        setGuestError(message);
        setGuestStatus('No conectado.');
        setGuestConnecting(false);
        setGuestConnected(false);
      }
    } else if (guestConnected) {
      // Ya estamos conectados, solo unirse al canal
      service.joinChannel(guestJoinTarget.trim());
      setGuestJoinTarget('');
    }
  }

  function handleGuestSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!guestServiceRef.current || !guestSelectedChannel || !guestDraft.trim()) return;

    guestServiceRef.current.sendMessage(guestSelectedChannel, guestDraft.trim());
    setGuestDraft('');
  }

  if (!sessionReady && !client) {
    return <div className="loading-screen">Cargando cliente...</div>;
  }

  if (!client) {
    if (guestViewOpen) {
      return (
        <div className="client-shell">
          <header className="client-topbar">
            <div>
              <p className="eyebrow">Modo invitado</p>
              <h1>Chat Hispano IRC</h1>
              <p className="lead">Cliente propio conectado al gateway IRC de Chat Hispano.</p>
            </div>

            <div className="topbar-meta">
              <span>{guestNickname || 'Invitado'}</span>
              <button className="ghost-button" onClick={closeGuestView} type="button">
                Salir
              </button>
            </div>
          </header>

          <div className="workspace">
            <aside className="sidebar">
              <form className="join-form" onSubmit={handleGuestJoinRoom}>
                <label>
                  Unirte a canal
                  <input
                    value={guestJoinTarget}
                    onChange={(event) => setGuestJoinTarget(event.target.value)}
                    placeholder="#canal"
                    disabled={guestConnecting}
                  />
                </label>
                <button className="primary-button" disabled={guestConnecting} type="submit">
                  {guestConnecting ? 'Conectando...' : 'Unir'}
                </button>
              </form>

              <div className="room-list">
                {guestChannels.map((channelName) => (
                  <button
                    key={channelName}
                    className={channelName === guestSelectedChannel ? 'room-item active' : 'room-item'}
                    onClick={() => setGuestSelectedChannel(channelName)}
                    type="button"
                  >
                    <span className="room-name">{channelName}</span>
                    <span className="room-meta">
                      {guestServiceRef.current?.getChannelUsers(channelName).length || 0} usuarios
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <main className="timeline-panel">
              {guestSelectedChannel ? (
                <>
                  <div className="timeline-header">
                    <div>
                      <h2>{guestSelectedChannel}</h2>
                      <p>IRC invitado</p>
                    </div>
                    <span>{guestUsers.length} conectados</span>
                  </div>

                  <div className="timeline">
                    {guestTimeline.length === 0 ? (
                      <div className="empty-state">Todavia no hay mensajes en este canal.</div>
                    ) : (
                      guestTimeline.map((message) => (
                        <article key={message.id} className={message.own ? 'message own' : 'message'}>
                          <div className="message-meta">
                            <strong>{message.sender}</strong>
                            <time>
                              {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </div>
                          <p>{message.body}</p>
                        </article>
                      ))
                    )}
                    <div ref={timelineEndRef} />
                  </div>

                  <form className="composer" onSubmit={handleGuestSendMessage}>
                    <input
                      value={guestDraft}
                      onChange={(event) => setGuestDraft(event.target.value)}
                      placeholder={guestConnected ? 'Escribe un mensaje' : 'Conectate primero...'}
                    />
                    <button className="primary-button" disabled={!guestConnected} type="submit">
                      Enviar
                    </button>
                  </form>
                </>
              ) : (
                <div className="empty-state large">
                  {guestConnecting
                    ? 'Conectando al IRC de Chat Hispano...'
                    : guestConnected
                    ? 'Conectado. Usa el panel izquierdo para unirte a un canal.'
                    : 'Ingresa un canal (ej: #hispano) en el panel izquierdo y presiona "Unir" para conectar.'}
                </div>
              )}
            </main>

            <aside className="members-panel">
              <h3>Participantes</h3>
              <div className="member-list">
                {guestUsers.map((member) => (
                  <div className="member-item" key={member.nickname}>
                    <span>{`${member.mode || ''}${member.nickname}`}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <footer className="footer-bar">
            <span>{guestStatus}</span>
            {guestError && <span className="error-inline">{guestError}</span>}
          </footer>
        </div>
      );
    }

    return (
      <div className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Cliente propio</p>
          <h1>Chat Hispano Matrix</h1>
          <p className="lead">
            Cliente web propio conectado al homeserver oficial de Chat Hispano.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Usuario
              <input
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="usuario o @usuario:chathispano.org"
                autoComplete="username"
              />
            </label>

            <label>
              Contrasena
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tu contrasena"
                autoComplete="current-password"
              />
            </label>

            <button className="primary-button" type="submit">
              Entrar
            </button>
          </form>

          <div className="login-divider">o</div>

          <button className="guest-button" onClick={handleGuestLogin} type="button">
            Entrar como Invitado (solo lectura)
          </button>

          <p className="status-line">{status}</p>
          {error && <p className="error-box">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="client-shell">
      <header className="client-topbar">
        <div>
          <p className="eyebrow">Cliente propio</p>
          <h1>Chat Hispano Matrix</h1>
        </div>

        <div className="topbar-meta">
          <span>{client.getUserId()} {isGuestMode && '(Invitado)'}</span>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Salir
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <form className="join-form" onSubmit={handleJoinRoom}>
            <label>
              Unirte a sala
              <input
                value={joinTarget}
                onChange={(event) => setJoinTarget(event.target.value)}
                placeholder="#canal:chathispano.org o !roomId"
              />
            </label>
            <button className="primary-button" type="submit">
              Unir
            </button>
          </form>

          <div className="room-list">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                className={room.roomId === selectedRoomId ? 'room-item active' : 'room-item'}
                onClick={() => setSelectedRoomId(room.roomId)}
                type="button"
              >
                <span className="room-name">{roomLabel(room)}</span>
                <span className="room-meta">{room.getJoinedMemberCount()} usuarios</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="timeline-panel">
          {selectedRoom ? (
            <>
              <div className="timeline-header">
                <div>
                  <h2>{roomLabel(selectedRoom)}</h2>
                  <p>{selectedRoom.getCanonicalAlias() || selectedRoom.roomId}</p>
                </div>
                <span>{members.length} conectados</span>
              </div>

              <div className="timeline">
                {messages.length === 0 ? (
                  <div className="empty-state">No hay mensajes cargados todavia.</div>
                ) : (
                  messages.map((message) => (
                    <article key={message.id} className={message.own ? 'message own' : 'message'}>
                      <div className="message-meta">
                        <strong>{message.sender}</strong>
                        <time>
                          {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <p>{message.body}</p>
                    </article>
                  ))
                )}
                <div ref={timelineEndRef} />
              </div>

              <form className="composer" onSubmit={handleSendMessage}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escribe un mensaje"
                />
                <button className="primary-button" type="submit">
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state large">No hay salas abiertas. Usa el panel izquierdo para unirte a una.</div>
          )}
        </main>

        <aside className="members-panel">
          <h3>Participantes</h3>
          <div className="member-list">
            {members.map((member) => (
              <div className="member-item" key={member.userId}>
                <span>{member.name || formatSender(member.userId)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <footer className="footer-bar">
        <span>{status}</span>
        {error && <span className="error-inline">{error}</span>}
      </footer>
    </div>
  );
};
