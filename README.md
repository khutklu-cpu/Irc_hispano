# IRC Hispano Client

Cliente IRC moderno y completamente funcional para conectarse al servidor **irc.irc-hispano.org**.

## Características

✅ **Funcionalidades IRC Completas**
- Conexión directa al servidor irc.irc-hispano.org (puerto 6667)
- Cambio de nickname en tiempo real
- Unirse y salir de canales
- Mensajes privados con otros usuarios
- Sistema de acciones (/me)
- Historial de mensajes por canal/usuario

✅ **Interfaz Moderna**
- Diseño similar al clásico mIRC pero con estética moderna
- Dark theme optimizado para largas sesiones
- Sidebar con lista de canales y privados
- Soporte responsive para diferentes tamaños de pantalla

✅ **Experiencia de Usuario**
- Auto-scroll en la ventana de chat
- Timestamps en cada mensaje
- Notificaciones de eventos del sistema
- Interfaz intuitiva y fácil de usar

## Tecnología

- **Frontend**: React 18 + TypeScript
- **Backend**: Node.js (proxy WebSocket)
- **Build**: Vite
- **Estado**: Zustand
- **CSS**: Vanilla CSS con variables personalizadas

## Instalación

1. Clonar el repositorio:
```bash
git clone <repo-url>
cd Irc_hispano
```

2. Instalar dependencias:
```bash
npm install
```

## Uso

### Desarrollo

1. Iniciar el servidor proxy:
```bash
node server.js
```

2. En otra terminal, iniciar el cliente web:
```bash
npm run dev
```

3. Abre `http://localhost:3000` en tu navegador

### Producción

```bash
npm run build
npm install -g serve
serve -s dist
```

## Cómo usar el cliente

1. **Conectarse**: Introduce un nickname y presiona "Conectar"
2. **Unirse a canales**: Escribe el nombre del canal en "Nuevo canal" y presiona "Unirse"
3. **Enviar mensajes**: Escribe en la caja de texto inferior y presiona "Enviar" o Enter
4. **Mensajes privados**: Presiona "+ Nuevo privado" e introduce un nickname
5. **Cambiar de canal/privado**: Haz clic en el nombre en la barra lateral

## Arquitectura

```
src/
├── components/
│   └── App.tsx           # Componente principal
├── services/
│   ├── ircService.ts     # Servicio IRC (lógica de conexión)
│   └── store.ts          # Estado global (Zustand)
├── types/
│   └── irc.ts            # Tipos TypeScript
├── styles/
│   └── App.css           # Estilos principales
└── main.tsx              # Punto de entrada

server.js                  # Proxy WebSocket para IRC
```

## Seguridad

- Validación de entrada en campos de texto
- Sanitización de mensajes (prevención XSS)
- Conexión segura vía WebSocket al proxy
- Sin almacenamiento de contraseñas
- Sesiones aisladas por cliente

## Licencia

MIT