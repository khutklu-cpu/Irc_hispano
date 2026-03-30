# Manual de Usuario - IRC Hispano Client

## Tabla de Contenidos
1. [Inicio Rápido](#inicio-rápido)
2. [Interfaz](#interfaz)
3. [Canales](#canales)
4. [Mensajes Privados](#mensajes-privados)
5. [Comandos](#comandos)
6. [Preguntas Frecuentes](#preguntas-frecuentes)
7. [Solución de Problemas](#solución-de-problemas)

---

## Inicio Rápido

### Paso 1: Acceder a la Aplicación
1. Abre tu navegador web
2. Ve a: `http://localhost:3000` (desarrollo) o la URL proporcionada

### Paso 2: Ingresar Nickname
1. En la pantalla de login, escribe tu nickname
2. El nickname puede contener: letras, números, guiones, corchetes, etc.
3. Máximo 30 caracteres

### Paso 3: Conectar
1. Haz clic en el botón "Conectar"
2. Espera a que cargue la interfaz (< 1 segundo)
3. ¡Ya estás conectado!

---

## Interfaz

### Disposición General

```
┌─────────────────────────────────────────────────────┐
│  IRC HISPANO  │  irc.irc-hispano.org  │  Usuario  │
├─────────────┬─────────────────────────────────────┐
│   Canales   │                                     │
│             │         Área de Chat                │
│  Privados   │                                     │
│             │  ┌───────────────────────────────┐  │
│  Usuarios   │  │ Mensajes del canal...         │  │
│             │  └───────────────────────────────┘  │
│             │  [Escribe un mensaje...]  [Enviar] │
└─────────────┴─────────────────────────────────────┘
```

### Elementos Principales

**Header (Cabecera)**
- Nombre de la aplicación
- Servidor actual (irc.irc-hispano.org)
- Tu nickname actual
- Estado de conexión (● Conectado)
- Botón Desconectar

**Sidebar Izquierdo**
- *Canales:* Lista de canales donde estás
- *Privados:* Conversaciones privadas abiertas
- *Usuarios:* Usuarios en el canal actual (colapsable)

**Área Principal de Chat**
- Cabecera: Nombre del canal/usuario actual
- Panel de mensajes: Historial de conversación
- Caja de entrada: Para escribir mensajes

---

## Canales

### Unirse a un Canal

**Método 1: Usar la interfaz**
1. Escribe el nombre del canal en "Nuevo canal" (sin #)
2. Ejemplo: `hispano` o `#hispano`
3. Haz clic "Unirse"
4. El canal aparecerá en la lista de canales

**Método 2: Usar comando**
1. En la caja de mensaje, escribe: `/join #canal`
2. Presiona Enter
3. Se agregará el canal a tu lista

### Navegar por Canales
1. Haz clic en el nombre del canal en la lista
2. La ventana de chat muestra los mensajes de ese canal
3. El canal se resalta en azul cuando está activo

### Salir de un Canal

**Método 1: Botón × (recomendado)**
1. Pasa el mouse sobre el nombre del canal
2. Haz clic en la ×

**Método 2: Comando**
1. Mientras estés en el canal, escribe: `/part`
2. Presiona Enter

### Canales Populares

- `#hispano` - Canal principal
- `#general` - Para general
- `#hispano-bots` - Para bots
- `#off-topic` - Fuera de tema

---

## Mensajes Privados

### Abrir un Privado

**Método 1: Desde el botón**
1. En la sección "Privados", haz clic "+ Nuevo privado"
2. Escribe el nickname del usuario
3. Haz clic "OK"

**Método 2: Desde la lista de usuarios**
1. En la sección "Usuarios", clic en el nombre
2. Se abrirá el chat privado con ese usuario

### Enviar Mensaje Privado
1. El privado se abre en una nueva pestaña
2. Escribe tu mensaje en la caja de texto
3. Haz clic "Enviar"
4. El mensaje se enviará privadamente

### Características Especiales
- Solo tú y el otro usuario ven los mensajes
- Se mantiene el historial de la conversación
- Puedes tener múltiples privados abiertos

---

## Comandos

### Sintaxis General
```
/comando [parámetros]
```

### Lista de Comandos

#### `/join #canal`
Unirse a un canal

**Uso:**
```
/join #hispano
/j #test
```

#### `/part`
Salir del canal actual

**Uso:**
```
/part
```

#### `/nick nuevo_nickname`
Cambiar tu nickname

**Uso:**
```
/nick usuario123
/nick _NewName
```

⚠️ **Nota:** El nuevo nickname debe cumplir las reglas (30 caracteres máximo)

#### `/me acción`
Enviar una acción (tipo roleplay)

**Uso:**
```
/me está tomando café
/me se va a trabajar
```

**Resultado:**
```
* Usuario está tomando café
```

#### `/help`
Mostrar esta ayuda en el chat

**Uso:**
```
/help
```

#### `/clear`
Limpiar el historial del canal actual

**Uso:**
```
/clear
```

⚠️ **Nota:** Solo limpia la vista local, no afecta a otros usuarios

#### `/quit`
Desconectar del servidor

**Uso:**
```
/quit
```

Después de desconectar, volverás a la pantalla de login.

---

## Características Especiales

### Auto-scroll
La ventana de chat se desplaza automáticamente hacia el último mensaje. No necesitas hacer scroll manualmente.

### Timestamps
Cada mensaje muestra la hora exacta de envío en formato HH:MM:SS.

### Sanitización
Los mensajes HTML se convierten automáticamente a texto, protegiéndote de scripts maliciosos.

### Límites
- Máximo 512 caracteres por mensaje
- Máximo 30 caracteres en nickname
- Los mensajes no pueden estar vacíos

---

## Preguntas Frecuentes

### ¿Qué es un canal?
Un canal es una sala de chat donde múltiples usuarios pueden comunicarse simultáneamente. Los canales empiezan con #. Ejemplo: #hispano

### ¿Cuál es la diferencia entre canal y privado?
- **Canal:** Todos ven los mensajes
- **Privado:** Solo tú y el otro usuario ven los mensajes

### ¿Puedo cambiar mi nickname?
Sí, usa el comando `/nick nuevo_nickname`

### ¿Se guardan los mensajes?
Los mensajes se guardan en tu navegador durante la sesión. Cuando cierres el navegador, se borran.

### ¿Puedo estar en múltiples canales a la vez?
Sí, puedes estar en tantos canales como desees. Haz clic en el canal para ver sus mensajes.

### ¿Qué pasa si desconecto?
Volverás a la pantalla de login y perderás tu historial de mensajes locales.

### ¿Puedo usar caracteres especiales en mensajes?
Sí, puedes usar:
- Letras acentuadas: á, é, í, ó, ú, ñ
- Emojis: 😊 🎉 ❤️
- Símbolos: € £ © ®

---

## Solución de Problemas

### Problema: No puedo conectarme

**Posibles causas:**
1. El servidor puede estar caído
2. Tu conexión a internet no funciona
3. El puerto 6667 está bloqueado

**Solución:**
1. Intenta cambiar tu nickname
2. Recarga la página (F5)
3. Si persiste, intenta después

### Problema: Mi mensaje no se envía

**Posibles causas:**
1. El mensaje está vacío
2. El mensaje tiene más de 512 caracteres
3. No estás en un canal "activo"

**Solución:**
1. Verifica que el campo esté lleno
2. Acorta el mensaje
3. Selecciona un canal de la lista

### Problema: No veo otros usuarios escribiendo

**Posibles causas:**
1. Puede haber poca actividad en el canal
2. Los usuarios pueden estar escribiendo privados

**Solución:**
1. Intenta enviar un mensaje para iniciar conversación
2. Prueba en #hispano (canal más activo)

### Problema: Consigo un error "Nickname no disponible"

**Solución:**
1. Intenta con otro nickname
2. Agrega un número: usuario123
3. Usa el comando: `/nick nuevoNick`

### Problema: Se desconecta la sesión

**Posibles causas:**
1. El servidor se desconectó
2. Tu conexión se interrumpió
3. La sesión expiró (30 minutos)

**Solución:**
1. Recarga la página
2. Vuelve a conectar con tu nickname

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| Enter | Enviar mensaje |
| Tab | Completar nickname (próximamente) |
| Ctrl+L | Limpiar campo de mensaje |
| Ctrl+A | Seleccionar todo en el mensaje |

---

## Consejos de Uso

1. **Sé respetuoso:** Usa un lenguaje apropiado en los canales
2. **Evita spam:** No envíes múltiples mensajes vacíos
3. **Usa comandos:** Apende los comandos para mejor experiencia
4. **Lee antes de escribir:** Entiende el contexto del canal
5. **Respeta privacidad:** No compartas información privada de otros

---

## Contacto y Soporte

Para reportar bugs o solicitar features:
1. Abre un issue en GitHub
2. Proporciona detalles del problema
3. Incluye capturas de pantalla si es posible

---

**Versión:** 1.0  
**Última actualización:** Marzo 2025  
**Servidor:** irc.irc-hispano.org
