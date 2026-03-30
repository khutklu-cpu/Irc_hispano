import { create } from 'zustand';
import { IRCService } from '../services/ircService';
import { Message, Channel } from '../types/irc';

interface StoreState {
  connected: boolean;
  nickname: string;
  channels: Map<string, Channel>;
  privateChats: Map<string, string[]>;
  currentTab: string;
  messages: Message[];
  error: string | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setNickname: (nickname: string) => void;
  addChannel: (name: string) => void;
  removeChannel: (name: string) => void;
  setCurrentTab: (tab: string) => void;
  addMessage: (message: Message) => void;
  joinChannel: (channelName: string) => void;
  leaveChannel: (channelName: string) => void;
  sendMessage: (target: string, content: string) => void;
  openPrivate: (nickname: string) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

const initialState = {
  connected: false,
  nickname: '',
  channels: new Map(),
  privateChats: new Map(),
  currentTab: 'home',
  messages: [],
  error: null
};

export const useIRCStore = create<StoreState>((set, get) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),
  
  setNickname: (nickname) => set({ nickname }),
  
  addChannel: (name) => {
    const channels = new Map(get().channels);
    if (!channels.has(name)) {
      channels.set(name, {
        name,
        users: new Map(),
        topic: '',
        messages: []
      });
    }
    set({ channels });
  },
  
  removeChannel: (name) => {
    const channels = new Map(get().channels);
    channels.delete(name);
    set({ channels });
  },
  
  setCurrentTab: (tab) => set({ currentTab: tab }),
  
  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },
  
  joinChannel: (channelName) => {
    const irc = new IRCService();
    irc.joinChannel(channelName);
    get().addChannel(channelName);
    set({ currentTab: channelName });
  },
  
  leaveChannel: (channelName) => {
    const irc = new IRCService();
    irc.leaveChannel(channelName);
    get().removeChannel(channelName);
    set({ currentTab: 'home' });
  },
  
  sendMessage: (target, content) => {
    const irc = new IRCService();
    irc.sendMessage(target, content);
  },
  
  openPrivate: (nickname) => {
    const privateChats = new Map(get().privateChats);
    if (!privateChats.has(nickname)) {
      privateChats.set(nickname, []);
    }
    set({ privateChats, currentTab: `@${nickname}` });
  },
  
  setError: (error) => set({ error }),
  
  resetStore: () => set(initialState)
}));
