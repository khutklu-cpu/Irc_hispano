import SockJS from 'sockjs-client';
import { IRCMessage, Channel, Message, PrivateChat, UserInfo } from '../types/irc';

const KIWI_SERVER = 'https://kiwi.chathispano.com:9000/webirc/kiwiirc/';
const IRC_HOST = 'irc.chathispano.com';
const IRC_PORT = 7002;
const CONTROL_CHANNEL = '0';
const IRC_CHANNEL = '1';

type StatePayload = {
  connected: boolean;
  nickname: string;
  server: string;
  port: number;
  channels: string[];
  error?: string;
  status?: string;
  action?: string;
};

function extractNickname(prefix?: string): string {
  if (!prefix) return '';
  return prefix.split('!')[0] || prefix;
}

function normalizeChannelName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export class IRCService {
  private socket: any = null;
  private nickname = '';
  private username = '';
  private realname = '';
  private connected = false;
  private gatewayReady = false;
  private ircReady = false;
  private channels: Map<string, Channel> = new Map();
  private privateChats: Map<string, PrivateChat> = new Map();
  private messageHandlers = new Set<(msg: Message) => void>();
  private stateHandlers = new Set<(state: StatePayload) => void>();
  private pendingControl: string[] = [];
  private pendingLines: string[] = [];
  private connectResolver: (() => void) | null = null;
  private connectRejecter: ((error: Error) => void) | null = null;
  private connectTimeout: number | null = null;

  static generateGuestNick(): string {
    const animals = ['Leon', 'Tigre', 'Caracol', 'Pez', 'Lince', 'Buho', 'Delfin', 'Pantera'];
    const adjectives = ['Veloz', 'Azul', 'Feliz', 'Brillante', 'Tenaz', 'Suave', 'Agil', 'Naranja'];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${animal}${adjective}${suffix}`;
  }

  async connect(nickname: string, username?: string, realname?: string): Promise<void> {
    this.disconnect(false);

    this.nickname = nickname.trim();
    this.username = (username || nickname).trim();
    this.realname = (realname || 'Invitado web de Chat Hispano').trim();
    this.gatewayReady = false;
    this.ircReady = false;
    this.connected = false;

    return new Promise((resolve, reject) => {
      this.connectResolver = resolve;
      this.connectRejecter = reject;
      this.connectTimeout = window.setTimeout(() => {
        this.failConnection(new Error('Tiempo de espera agotado conectando al IRC.'));
      }, 15000);

      this.pendingControl.push(`HOST ${IRC_HOST}:+${IRC_PORT}`);
      this.pendingLines.push('CAP LS 302');
      this.pendingLines.push(`NICK ${this.nickname}`);
      this.pendingLines.push(`USER ${this.username} 0 * :${this.realname}`);

      const socket = new SockJS(KIWI_SERVER, undefined, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      });
      this.socket = socket;

      socket.onopen = () => {
        this.emitStateChange({
          connected: false,
          nickname: this.nickname,
          server: IRC_HOST,
          port: IRC_PORT,
          channels: this.getChannels(),
          status: 'Conectando al gateway IRC...',
          action: 'socket-open',
        });

        this.socket?.send(`:${CONTROL_CHANNEL} CONTROL START`);
        this.socket?.send(`:${IRC_CHANNEL}`);
      };

      socket.onmessage = (event: { data: unknown }) => {
        this.handleSocketMessage(String(event.data));
      };

      socket.onclose = () => {
        const wasConnected = this.connected;
        this.gatewayReady = false;
        this.ircReady = false;
        this.connected = false;

        if (!wasConnected) {
          this.failConnection(new Error('El gateway IRC cerro la conexion antes de completar el acceso.'));
          return;
        }

        this.emitStateChange({
          connected: false,
          nickname: this.nickname,
          server: IRC_HOST,
          port: IRC_PORT,
          channels: this.getChannels(),
          status: 'Conexion IRC cerrada.',
          action: 'socket-close',
        });
      };
    });
  }

  joinChannel(channelName: string): void {
    const normalized = normalizeChannelName(channelName);
    if (!normalized) return;

    this.ensureChannel(normalized);
    this.sendRaw(`JOIN ${normalized}`);
    this.emitStateChange({
      connected: this.connected,
      nickname: this.nickname,
      server: IRC_HOST,
      port: IRC_PORT,
      channels: this.getChannels(),
      status: `Uniendose a ${normalized}...`,
      action: 'join-channel',
    });
  }

  leaveChannel(channelName: string): void {
    const normalized = normalizeChannelName(channelName);
    if (!normalized) return;
    this.sendRaw(`PART ${normalized}`);
  }

  sendMessage(target: string, message: string): void {
    const sanitized = this.sanitizeMessage(message);
    if (!sanitized) return;

    this.sendRaw(`PRIVMSG ${target} :${sanitized}`);

    const msg: Message = {
      timestamp: new Date(),
      nickname: this.nickname,
      content: sanitized,
      type: 'privmsg',
      channel: target,
    };

    this.storeMessage(target, msg);
  }

  sendAction(target: string, action: string): void {
    const sanitized = this.sanitizeMessage(action);
    if (!sanitized) return;

    this.sendRaw(`PRIVMSG ${target} :\u0001ACTION ${sanitized}\u0001`);

    const msg: Message = {
      timestamp: new Date(),
      nickname: this.nickname,
      content: sanitized,
      type: 'action',
      channel: target,
    };

    this.storeMessage(target, msg);
  }

  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  getChannelUsers(channelName: string): UserInfo[] {
    const channel = this.channels.get(channelName);
    return channel ? Array.from(channel.users.values()) : [];
  }

  getChannelMessages(channelName: string): Message[] {
    const channel = this.channels.get(channelName);
    return channel ? channel.messages : [];
  }

  getPrivateChatMessages(nickname: string): Message[] {
    const chat = this.privateChats.get(nickname);
    return chat ? chat.messages : [];
  }

  getPrivateChats(): string[] {
    return Array.from(this.privateChats.keys());
  }

  onMessage(handler: (msg: Message) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: (state: StatePayload) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  parseIRCMessage(line: string): IRCMessage {
    const message: IRCMessage = {
      command: '',
      params: [],
      raw: line,
    };

    let rest = line;

    if (rest.startsWith(':')) {
      const spaceIndex = rest.indexOf(' ');
      message.prefix = rest.substring(1, spaceIndex);
      rest = rest.substring(spaceIndex + 1);
    }

    const trailingIndex = rest.indexOf(' :');
    if (trailingIndex !== -1) {
      message.trailing = rest.substring(trailingIndex + 2);
      rest = rest.substring(0, trailingIndex);
    }

    const parts = rest.split(' ').filter(Boolean);
    message.command = parts.shift() || '';
    message.params = parts;

    return message;
  }

  disconnect(clearData = true): void {
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    this.connectResolver = null;
    this.connectRejecter = null;

    if (this.socket) {
      try {
        if (this.ircReady) {
          this.socket.send(`:${IRC_CHANNEL} QUIT :Hasta luego`);
        }
      } catch {
        // Ignore socket send failures while disconnecting.
      }

      try {
        this.socket.close();
      } catch {
        // Ignore close errors.
      }

      this.socket = null;
    }

    this.gatewayReady = false;
    this.ircReady = false;
    this.connected = false;
    this.pendingControl = [];
    this.pendingLines = [];

    if (clearData) {
      this.channels.clear();
      this.privateChats.clear();
      this.emitStateChange({
        connected: false,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: [],
        status: 'Desconectado.',
        action: 'disconnect',
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getNickname(): string {
    return this.nickname;
  }

  setNickname(newNickname: string): void {
    const nextNickname = newNickname.trim();
    if (!nextNickname) return;
    this.nickname = nextNickname;
    this.sendRaw(`NICK ${nextNickname}`);
  }

  private handleSocketMessage(data: string): void {
    if (!data.startsWith(':')) {
      return;
    }

    const spaceIndex = data.indexOf(' ');
    if (spaceIndex === -1) {
      const channelId = data.substring(1);
      if (channelId === IRC_CHANNEL) {
        this.gatewayReady = true;
        this.flushControlQueue();
        this.sendControl('ENCODING utf8');
      }
      return;
    }

    const channelId = data.substring(1, spaceIndex);
    const payload = data.substring(spaceIndex + 1);
    if (channelId !== IRC_CHANNEL) {
      return;
    }

    if (payload.startsWith('control connected')) {
      this.ircReady = true;
      this.flushLineQueue();
      return;
    }

    if (payload.startsWith('control closed')) {
      this.failConnection(new Error('El gateway IRC cerro el canal de acceso.'));
      return;
    }

    this.handleIrcLine(payload);
  }

  private handleIrcLine(line: string): void {
    const message = this.parseIRCMessage(line);
    const command = message.command.toUpperCase();
    const nickname = extractNickname(message.prefix);

    if (command === 'PING') {
      this.sendRaw(`PONG :${message.trailing || message.params[0] || ''}`);
      return;
    }

    if (command === '001') {
      this.connected = true;
      this.resolveConnection();
      this.emitStateChange({
        connected: true,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        status: 'Conectado al IRC de Chat Hispano.',
        action: 'registered',
      });
      return;
    }

    if (command === '332') {
      const channelName = message.params[1];
      const channel = this.ensureChannel(channelName);
      channel.topic = message.trailing || '';
      this.emitStateChange({
        connected: this.connected,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        action: 'topic',
      });
      return;
    }

    if (command === '353') {
      const channelName = message.params[2];
      const channel = this.ensureChannel(channelName);
      const names = (message.trailing || '').split(' ').filter(Boolean);
      names.forEach((rawName) => {
        const mode = ['@', '+', '%', '&', '~'].includes(rawName[0]) ? rawName[0] : undefined;
        const cleanName = mode ? rawName.slice(1) : rawName;
        channel.users.set(cleanName, { nickname: cleanName, mode });
      });
      this.emitStateChange({
        connected: this.connected,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        action: 'names',
      });
      return;
    }

    if (command === 'JOIN') {
      const channelName = normalizeChannelName(message.trailing || message.params[0] || '');
      const channel = this.ensureChannel(channelName);
      channel.users.set(nickname, { nickname });
      this.emitSystemMessage(channelName, `${nickname} se ha unido a ${channelName}`);
      return;
    }

    if (command === 'PART') {
      const channelName = normalizeChannelName(message.params[0] || '');
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.users.delete(nickname);
      }
      this.emitSystemMessage(channelName, `${nickname} ha salido de ${channelName}`);

      if (nickname === this.nickname) {
        this.channels.delete(channelName);
      }

      this.emitStateChange({
        connected: this.connected,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        action: 'part',
      });
      return;
    }

    if (command === 'QUIT') {
      this.channels.forEach((channel) => {
        channel.users.delete(nickname);
      });
      this.emitStateChange({
        connected: this.connected,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        action: 'quit',
      });
      return;
    }

    if (command === 'NICK') {
      const nextNickname = message.trailing || message.params[0] || '';
      if (nickname === this.nickname) {
        this.nickname = nextNickname;
      }

      this.channels.forEach((channel) => {
        const existing = channel.users.get(nickname);
        if (existing) {
          channel.users.delete(nickname);
          channel.users.set(nextNickname, { nickname: nextNickname, mode: existing.mode });
        }
      });

      this.emitStateChange({
        connected: this.connected,
        nickname: this.nickname,
        server: IRC_HOST,
        port: IRC_PORT,
        channels: this.getChannels(),
        action: 'nick',
      });
      return;
    }

    if (command === '433') {
      const nextNickname = `${this.nickname}${Math.floor(Math.random() * 90 + 10)}`;
      this.nickname = nextNickname;
      this.sendRaw(`NICK ${nextNickname}`);
      return;
    }

    if (command === 'PRIVMSG' || command === 'NOTICE') {
      const target = message.params[0] || '';
      const content = message.trailing || '';
      const isAction = content.startsWith('\u0001ACTION ') && content.endsWith('\u0001');
      const normalizedContent = isAction ? content.slice(8, -1) : content;
      const channelName = target.startsWith('#') ? target : nickname;

      const nextMessage: Message = {
        timestamp: new Date(),
        nickname,
        content: normalizedContent,
        type: isAction ? 'action' : command === 'NOTICE' ? 'notice' : 'privmsg',
        channel: channelName,
      };

      this.storeMessage(channelName, nextMessage);
      return;
    }

    if (command === '465' || command === 'ERROR') {
      const errorMessage = message.trailing || 'Conexion rechazada por la red IRC.';
      this.failConnection(new Error(errorMessage));
    }
  }

  private ensureChannel(channelName: string): Channel {
    const normalized = normalizeChannelName(channelName);
    if (!this.channels.has(normalized)) {
      this.channels.set(normalized, {
        name: normalized,
        users: new Map(),
        messages: [],
      });
    }
    return this.channels.get(normalized)!;
  }

  private sendControl(line: string): void {
    if (this.gatewayReady && this.socket) {
      this.socket.send(`:${IRC_CHANNEL} ${line}`);
      return;
    }
    this.pendingControl.push(line);
  }

  private flushControlQueue(): void {
    if (!this.gatewayReady || !this.socket) return;
    const queued = [...this.pendingControl];
    this.pendingControl = [];
    queued.forEach((line) => {
      this.socket?.send(`:${IRC_CHANNEL} ${line}`);
    });
  }

  private sendRaw(line: string): void {
    if (this.ircReady && this.socket) {
      this.socket.send(`:${IRC_CHANNEL} ${line}`);
      return;
    }
    this.pendingLines.push(line);
  }

  private flushLineQueue(): void {
    if (!this.ircReady || !this.socket) return;
    const queued = [...this.pendingLines];
    this.pendingLines = [];
    queued.forEach((line) => {
      this.socket?.send(`:${IRC_CHANNEL} ${line}`);
    });
  }

  private storeMessage(target: string, message: Message): void {
    if (target.startsWith('#')) {
      const channel = this.ensureChannel(target);
      channel.messages.push(message);
    } else {
      if (!this.privateChats.has(target)) {
        this.privateChats.set(target, { nickname: target, messages: [] });
      }
      this.privateChats.get(target)!.messages.push(message);
    }

    this.emitMessage(message);
    this.emitStateChange({
      connected: this.connected,
      nickname: this.nickname,
      server: IRC_HOST,
      port: IRC_PORT,
      channels: this.getChannels(),
      action: 'message',
    });
  }

  private emitMessage(msg: Message): void {
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  private emitStateChange(state: StatePayload): void {
    this.stateHandlers.forEach((handler) => handler(state));
  }

  private emitSystemMessage(channel: string, content: string): void {
    const msg: Message = {
      timestamp: new Date(),
      nickname: 'SYSTEM',
      content,
      type: 'system',
      channel,
    };
    this.storeMessage(channel, msg);
  }

  private sanitizeMessage(message: string): string {
    return message
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim()
      .substring(0, 512);
  }

  private resolveConnection(): void {
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    const resolver = this.connectResolver;
    this.connectResolver = null;
    this.connectRejecter = null;
    resolver?.();
  }

  private failConnection(error: Error): void {
    if (this.connectTimeout !== null) {
      window.clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    const rejecter = this.connectRejecter;
    this.connectResolver = null;
    this.connectRejecter = null;

    this.emitStateChange({
      connected: false,
      nickname: this.nickname,
      server: IRC_HOST,
      port: IRC_PORT,
      channels: this.getChannels(),
      error: error.message,
      status: 'No conectado.',
      action: 'error',
    });

    rejecter?.(error);
  }
}

export const ircService = new IRCService();
