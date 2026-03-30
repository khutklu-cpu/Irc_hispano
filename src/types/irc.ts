export interface IRCMessage {
  command: string;
  params: string[];
  prefix?: string;
  trailing?: string;
  raw: string;
}

export interface Channel {
  name: string;
  users: Map<string, UserInfo>;
  topic?: string;
  modes?: string;
  messages: Message[];
}

export interface UserInfo {
  nickname: string;
  mode?: string; // @, +, etc.
}

export interface Message {
  timestamp: Date;
  nickname: string;
  content: string;
  type: 'privmsg' | 'action' | 'notice' | 'system';
  channel: string;
}

export interface PrivateChat {
  nickname: string;
  messages: Message[];
}

export interface ConnectionState {
  connected: boolean;
  nickname: string;
  server: string;
  port: number;
  channels: Map<string, Channel>;
  privateChats: Map<string, PrivateChat>;
  currentTab: string;
  motd?: string;
}
