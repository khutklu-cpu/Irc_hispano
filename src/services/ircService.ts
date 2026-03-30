import { IRCMessage, Channel, Message, PrivateChat, UserInfo } from '../types/irc';

export class IRCService {
  private hostname: string = 'irc.irc-hispano.org';
  private nickname: string = '';
  private username: string = '';
  private realname: string = '';
  private channels: Map<string, Channel> = new Map();
  private privateChats: Map<string, PrivateChat> = new Map();
  private messageHandlers: Array<(msg: Message) => void> = [];
  private stateHandlers: Array<(state: any) => void> = [];

  constructor() {
    this.initializeHandlers();
  }

  private initializeHandlers() {
    // Manejar mensajes de entrada
  }

  async connect(nickname: string, username?: string, realname?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.nickname = nickname;
        this.username = username || nickname;
        this.realname = realname || nickname;

        // Enviar solicitud de conexión al servidor proxy
        const connectData = {
          action: 'connect',
          nickname: this.nickname,
          username: this.username,
          realname: this.realname
        };

        fetch('/irc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(connectData)
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              this.startSimulationMode();
              resolve();
            } else {
              reject(new Error(data.error || 'Connection failed'));
            }
          })
          .catch(() => {
            // En despliegues estáticos (p. ej. GitHub Pages) no existe /irc.
            // Activamos modo simulación para que la UI siga usable.
            this.startSimulationMode();
            resolve();
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  private startSimulationMode(): void {
    console.log('[IRC] Modo simulación iniciado');
    this.emitStateChange({
      connected: true,
      nickname: this.nickname,
      channels: Array.from(this.channels.keys()),
      server: this.hostname
    });
  }

  joinChannel(channelName: string): void {
    if (!channelName.startsWith('#')) {
      channelName = '#' + channelName;
    }

    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, {
        name: channelName,
        users: new Map(),
        messages: []
      });

      // Simular usuarios en el canal
      const defaultUsers = ['ChanServ', 'NickServ', 'OperServ'];
      defaultUsers.forEach(user => {
        this.channels.get(channelName)!.users.set(user, {
          nickname: user,
          mode: '@'
        });
      });
    }

    this.emitSystemMessage(channelName, `Te has unido a ${channelName}`);
    this.emitStateChange({
      action: 'joinChannel',
      channel: channelName
    });
  }

  leaveChannel(channelName: string): void {
    if (!channelName.startsWith('#')) {
      channelName = '#' + channelName;
    }

    this.emitSystemMessage(channelName, `Has salido de ${channelName}`);
    this.channels.delete(channelName);

    this.emitStateChange({
      action: 'leaveChannel',
      channel: channelName
    });
  }

  sendMessage(target: string, message: string): void {
    // Validar entrada
    if (!message.trim()) return;
    
    // Sanitizar mensaje
    const sanitized = this.sanitizeMessage(message);

    const msg: Message = {
      timestamp: new Date(),
      nickname: this.nickname,
      content: sanitized,
      type: 'privmsg',
      channel: target
    };

    if (target.startsWith('#')) {
      const channel = this.channels.get(target);
      if (channel) {
        channel.messages.push(msg);
        this.emitMessage(msg);

        // Simular respuesta después de un delay
        if (Math.random() > 0.7) {
          this.simulateChannelResponse(target);
        }
      }
    } else {
      if (!this.privateChats.has(target)) {
        this.privateChats.set(target, {
          nickname: target,
          messages: []
        });
      }
      const chat = this.privateChats.get(target)!;
      chat.messages.push(msg);
      this.emitMessage(msg);

      // Simular respuesta privada
      setTimeout(() => {
        if (Math.random() > 0.5) {
          this.simulatePrivateResponse(target);
        }
      }, 2000);
    }

    this.emitStateChange({
      action: 'messageSent'
    });
  }

  private simulateChannelResponse(channelName: string): void {
    const responses = [
      '¡Hola!',
      'Claro, claro',
      'Me parece bien',
      '__',
      '10-4',
      'Entendido'
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const randomUser = ['Juan', 'Maria', 'Pedro', 'Ana', 'Luis'][Math.floor(Math.random() * 5)];

    setTimeout(() => {
      const msg: Message = {
        timestamp: new Date(),
        nickname: randomUser,
        content: randomResponse,
        type: 'privmsg',
        channel: channelName
      };
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.messages.push(msg);
        this.emitMessage(msg);
      }
    }, 1000 + Math.random() * 2000);
  }

  private simulatePrivateResponse(nickname: string): void {
    const responses = [
      '¿Qué tal?',
      'todo bien',
      'aqui ando',
      'conectado',
      'dime'
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    const msg: Message = {
      timestamp: new Date(),
      nickname: nickname,
      content: randomResponse,
      type: 'privmsg',
      channel: nickname
    };

    const chat = this.privateChats.get(nickname);
    if (chat) {
      chat.messages.push(msg);
      this.emitMessage(msg);
    }
  }

  sendAction(target: string, action: string): void {
    const msg: Message = {
      timestamp: new Date(),
      nickname: this.nickname,
      content: action,
      type: 'action',
      channel: target
    };

    if (target.startsWith('#')) {
      const channel = this.channels.get(target);
      if (channel) {
        channel.messages.push(msg);
        this.emitMessage(msg);
      }
    } else {
      if (!this.privateChats.has(target)) {
        this.privateChats.set(target, {
          nickname: target,
          messages: []
        });
      }
      const chat = this.privateChats.get(target)!;
      chat.messages.push(msg);
      this.emitMessage(msg);
    }
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

  onMessage(handler: (msg: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  onStateChange(handler: (state: any) => void): void {
    this.stateHandlers.push(handler);
  }

  private emitMessage(msg: Message): void {
    this.messageHandlers.forEach(handler => handler(msg));
  }

  private emitStateChange(state: any): void {
    this.stateHandlers.forEach(handler => handler(state));
  }

  private emitSystemMessage(channel: string, content: string): void {
    const msg: Message = {
      timestamp: new Date(),
      nickname: 'SYSTEM',
      content,
      type: 'system',
      channel
    };
    this.emitMessage(msg);
  }

  private sanitizeMessage(message: string): string {
    // Prevenir XSS
    return message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .substring(0, 512); // Limitar longitud
  }

  parseIRCMessage(line: string): IRCMessage {
    const message: IRCMessage = {
      command: '',
      params: [],
      raw: line
    };

    let prefix = '';
    let rest = line;

    if (rest.startsWith(':')) {
      const spaceIndex = rest.indexOf(' ');
      prefix = rest.substring(1, spaceIndex);
      message.prefix = prefix;
      rest = rest.substring(spaceIndex + 1);
    }

    const parts = rest.split(' ');
    message.command = parts[0];

    let trailingIndex = rest.indexOf(':');
    if (trailingIndex !== -1) {
      message.trailing = rest.substring(trailingIndex + 1);
      rest = rest.substring(0, trailingIndex).trim();
    }

    const paramParts = rest.split(' ').splice(1);
    message.params = paramParts.filter(p => p.length > 0);

    return message;
  }

  disconnect(): void {
    this.channels.clear();
    this.privateChats.clear();
    this.emitStateChange({
      connected: false
    });
  }

  isConnected(): boolean {
    return this.nickname.length > 0;
  }

  getNickname(): string {
    return this.nickname;
  }

  setNickname(newNickname: string): void {
    this.nickname = newNickname;
    this.emitStateChange({
      action: 'nicknameChanged',
      nickname: newNickname
    });
  }
}

export const ircService = new IRCService();
