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
  const timelineEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [selectedRoomId, tick]);

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
    setIsGuestMode(false);
  }

  async function handleGuestLogin() {
    setError('');
    setStatus('Intentando acceso como invitado...');
    
    try {
      // Intentar guest register primero
      const guestClient = createMatrixClient();
      await guestClient.registerGuest();
      
      setClient(guestClient);
      setUserId('(Invitado)');
      setStatus('Conectado como invitado.');
      setSessionReady(true);
      setIsGuestMode(true);
    } catch (guestError) {
      // Si falla guest login, redirigir a la web oficial que SÍ lo soporta
      const message = guestError instanceof Error ? guestError.message : 'Error desconocido';
      
      if (message.includes('M_FORBIDDEN') || message.includes('disabled')) {
        // El servidor no soporta guest, abrir la web oficial
        setError('El servidor Matrix requiere cuenta. Abriendo web oficial con guest...');
        setStatus('Redirigiendo a chathispano.com/element...');
        
        setTimeout(() => {
          window.location.href = 'https://chathispano.com/element/#/welcome';
        }, 2000);
      } else {
        setError(`No se pudo conectar como invitado: ${message}`);
        setStatus('No conectado.');
        setSessionReady(true);
      }
    }
  }

  if (!sessionReady && !client) {
    return <div className="loading-screen">Cargando cliente...</div>;
  }

  if (!client) {
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
