/**
 * Configuración del Cliente IRC Hispano
 * Este archivo contiene todas las configuraciones necesarias
 */

export const IRC_CONFIG = {
  // Servidor IRC
  SERVER: {
    HOST: 'irc.irc-hispano.org',
    PORT: 6667,
    PORT_SSL: 6697,
    USE_SSL: false, // Cambiar a true para mayor seguridad
    TIMEOUT: 30000, // ms
  },

  // Límites del cliente
  LIMITS: {
    MAX_NICKNAME_LENGTH: 30,
    MAX_MESSAGE_LENGTH: 512,
    MAX_CHANNEL_NAME_LENGTH: 32,
    MIN_MESSAGE_INTERVAL: 500, // ms entre mensajes
  },

  // Canales por defecto
  DEFAULT_CHANNELS: [
    '#hispano',
    '#general',
  ],

  // Usuarios simulados (para demostración)
  DEMO_USERS: [
    'ChanServ',
    'NickServ',
    'OperServ',
    'Juan',
    'Maria',
    'Pedro',
    'Ana',
    'Luis',
    'Sofia',
    'Fernando',
  ],

  // Configuración de UI
  UI: {
    THEME: 'dark',
    AUTO_SCROLL: true,
    SHOW_TIMESTAMPS: true,
    SHOW_SYSTEM_MESSAGES: true,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  },

  // Configuración de comandos
  COMMANDS: {
    AVAILABLE: [
      'join',  // /join #canal
      'part',  // /part
      'nick',  // /nick nuevo_nick
      'me',    // /me acción
      'clear', // /clear
      'help',  // /help
      'quit',  // /quit
    ],
  },

  // Caracteres permitidos en nickname (RFC 2812)
  NICKNAME_REGEX: /^[a-zA-Z0-9_\-\[\]{}`\\|]{1,30}$/,

  // Desarrollo
  API: {
    BASE_URL: process.env.VITE_API_URL || 'http://localhost:3001',
    TIMEOUT: 10000,
  },

  // Niveles de log
  LOG_LEVEL: process.env.VITE_LOG_LEVEL || 'info', // 'debug' | 'info' | 'warn' | 'error'
};

// Mensajes predeterminados del sistema
export const SYSTEM_MESSAGES = {
  CONNECTED: 'Conectado a IRC Hispano',
  DISCONNECTED: 'Desconectado del servidor',
  JOINED_CHANNEL: (channel: string) => `Te has unido a ${channel}`,
  LEFT_CHANNEL: (channel: string) => `Has salido de ${channel}`,
  NICKNAME_CHANGED: (newNick: string) => `Cambió nickname a ${newNick}`,
  ERROR: (msg: string) => `Error: ${msg}`,
};

// Respuestas simuladas para demostración
export const DEMO_RESPONSES = [
  '¡Hola!',
  'Claro, claro',
  'Me parece bien',
  '__',
  '10-4',
  'Entendido',
  'Exacto',
  'De acuerdo',
  'Perfecto',
  'Vale',
];

export default IRC_CONFIG;
