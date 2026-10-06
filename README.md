<p align="center">
  <img alt="Baileys logo" src="https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/Media/logo.png" height="85"/>
</p>

# Baileys 🌿

> Librería en JavaScript puro (ESM) para interactuar directamente con los servidores de WhatsApp Web mediante WebSockets, rápida, modular y libre de navegadores pesados.

<p align="center">
  <img src="https://img.shields.io/badge/Status-Activo-22c55e?style=flat" alt="Status">
  <img src="https://img.shields.io/badge/Node.js-v20+-16a34a?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Versi%C3%B3n-v7.0.0--rc14-2563eb?style=flat" alt="Versión">
  <img src="https://img.shields.io/badge/Formato-ESM%20Puro-7c3aed?style=flat" alt="Formato">
  <img src="https://img.shields.io/badge/Licencia-MIT-f59e0b?style=flat" alt="Licencia">
</p>

<p align="center">
  <a href="https://github.com/muleff/b">
    <img src="https://img.shields.io/badge/Repositorio-muleff%2Fb-7c3aed?style=for-the-badge&logo=github&logoColor=white" alt="Repositorio">
  </a>
</p>

> [!CAUTION]
> **AVISO DE CAMBIOS IMPORTANTES (BREAKING CHANGES)**
> A partir de la versión 7.0.0, la librería introdujo optimizaciones estructurales clave. Esta compilación está configurada en JavaScript puro ESM para Node.js 20+.
> Consulta [whiskey.so/migrate-latest](https://whiskey.so/migrate-latest) para guías oficiales de migración desde versiones anteriores.

---

## 📌 Características Principales

- ⚡ **Sin navegadores pesados**: No utiliza Chromium, Puppeteer ni Selenium. Se conecta directamente a través de **WebSockets**, ahorrando más de 500 MB de memoria RAM por instancia.
- 📱 **Multi-Dispositivo Nativo**: Compatible con las versiones modernas de WhatsApp Web y dispositivos vinculados.
- 🚀 **Compilado a JavaScript Puro (ESM)**: Sin necesidad de TypeScript ni herramientas de build complejas; compatible de inmediato con `import` en Node.js 20+.
- 📢 **Canales (Newsletters)**: Soporte completo para crear, buscar, seguir, silenciar y administrar canales de WhatsApp.
- 👥 **Comunidades**: Soporte para creación de comunidades y vinculación/desvinculación de grupos.
- 📅 **Eventos de Grupo**: Creación y gestión de eventos de WhatsApp con llamadas programadas.
- 🎙️ **Notas de Voz Avanzadas**: Generación de audios PTT con barra de ondas (`waveform`) interactiva.
- 🔒 **Seguridad y Cifrado**: Cifrado E2E mediante Signal Protocol integrado.

---

## 🪴 Requisitos del Sistema

| Requisito | Versión / Estado | Descripción |
|---|---|---|
| **Node.js** | `>= 20.0.0` | Entorno de ejecución con soporte ECMAScript Modules nativo |
| **Git** | Cualquiera | Para clonar e instalar el repositorio |
| **FFmpeg** | *Opcional* | Recomendado para stickers animados, transcodificación de audio y video |

<p>
  <a href="https://nodejs.org/en/download"><img src="https://img.shields.io/badge/Node.js-1e3a8a?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js"></a>
  <a href="https://git-scm.com/downloads"><img src="https://img.shields.io/badge/Git-0f172a?style=flat&logo=git&logoColor=22c55e" alt="Git"></a>
  <a href="https://ffmpeg.org/download.html"><img src="https://img.shields.io/badge/FFmpeg-14532d?style=flat&logo=ffmpeg&logoColor=white" alt="FFmpeg"></a>
</p>

---

## 📦 Instalación

<details open>
<summary><strong>🍃 Instalación Rápida con NPM</strong></summary>

Instala directamente desde este repositorio:

```bash
npm install https://github.com/muleff/b
```

O clona el repositorio localmente para tu proyecto:

```bash
git clone https://github.com/muleff/b.git
cd b
npm install
```

Importación básica en tus archivos `.js`:

```javascript
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from 'baileys';
```

</details>

<details>
<summary><strong>🐧 Instalación en Linux / Ubuntu / Debian</strong></summary>

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nodejs npm ffmpeg build-essential
```

</details>

<details>
<summary><strong>🍎 Instalación en macOS (Homebrew)</strong></summary>

```bash
brew install git node ffmpeg
```

</details>

<details>
<summary><strong>🪟 Instalación en Windows</strong></summary>

1. Descarga e instala [Node.js (v20+ LTS)](https://nodejs.org/).
2. Descarga e instala [Git para Windows](https://git-scm.com/).
3. *(Opcional)* Descarga [FFmpeg](https://ffmpeg.org/download.html) y agrégalo a tu variable de entorno PATH.

</details>

---

## 📑 Tabla de Contenidos

1. [🔌 Conexión de la Cuenta](#-conexión-de-la-cuenta)
   - [Conexión mediante Código QR](#conexión-mediante-código-qr)
   - [Conexión mediante Código de Emparejamiento (Pairing Code)](#conexión-mediante-código-de-emparejamiento-pairing-code)
   - [Sincronización de Historial Completo](#sincronización-de-historial-completo)
2. [⚙️ Configuraciones Clave del Socket](#️-configuraciones-clave-del-socket)
   - [Caché de Metadatos de Grupos](#caché-de-metadatos-de-grupos)
   - [Manejo de Reintentos de Mensajes](#manejo-de-reintentos-de-mensajes)
   - [Recibir Notificaciones en el Teléfono](#recibir-notificaciones-en-el-teléfono)
3. [💾 Guardar y Restaurar Sesiones](#-guardar-y-restaurar-sesiones)
4. [📡 Manejo de Eventos](#-manejo-de-eventos)
   - [Ejemplo Base de Inicialización](#ejemplo-base-de-inicialización)
   - [Resumen de Eventos Frecuentes](#resumen-de-eventos-frecuentes)
5. [🆔 Estructura de IDs de WhatsApp (JID)](#-estructura-de-ids-de-whatsapp-jid)
6. [💬 Envío de Mensajes](#-envío-de-mensajes)
   - [Mensajes de Texto, Menciones y Citas](#mensajes-de-texto-menciones-y-citas)
   - [Mensajes Multimedia (Imágenes, Videos, GIFs, Documentos)](#mensajes-multimedia)
   - [Notas de Voz PTT con Forma de Onda (Waveform)](#notas-de-voz-ptt-con-forma-de-onda-waveform)
   - [Ubicación y Contactos (vCard)](#ubicación-y-contactos-vcard)
   - [Reacciones y Reenvíos](#reacciones-y-reenvíos)
   - [Encuestas Interactivas y Votos](#encuestas-interactivas-y-votos)
   - [📅 Eventos de WhatsApp en Grupos](#-eventos-de-whatsapp-en-grupos)
   - [📌 Fijar Mensajes (Pin) con Duración](#-fijar-mensajes-pin-con-duración)
   - [Mensajes de Visualización Única (View Once)](#mensajes-de-visualización-única-view-once)
7. [✏️ Modificación y Eliminación de Mensajes](#️-modificación-y-eliminación-de-mensajes)
8. [📥 Descarga de Archivos Multimedia](#-descarga-de-archivos-multimedia)
9. [🌐 Estados y Presencia en el Chat](#-estados-y-presencia-en-el-chat)
10. [🗂️ Modificación y Gestión de Chats](#️-modificación-y-gestión-de-chats)
11. [👥 Administración de Grupos](#-administración-de-grupos)
12. [📢 Canales de WhatsApp (Newsletters)](#-canales-de-whatsapp-newsletters)
13. [🌐 Comunidades de WhatsApp](#-comunidades-de-whatsapp)
14. [📞 Llamadas y Enlaces Directos](#-llamadas-y-enlaces-directos)
15. [🔒 Privacidad y Bloqueos](#-privacidad-y-bloqueos)
16. [🌱 Créditos y Agradecimientos](#-créditos-y-agradecimientos)
17. [⚠️ Descargo de Responsabilidad (Disclaimer)](#️-descargo-de-responsabilidad-disclaimer)

---

## 🔌 Conexión de la Cuenta

### Conexión mediante Código QR

Por defecto, si no se especifica un número para código de emparejamiento, el evento `connection.update` emitirá un código QR para escanear desde la aplicación móvil:

```javascript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import { Boom } from '@hapi/boom';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // Imprime el código QR directamente en consola
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('⚡ Nuevo código QR listo para escanear');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('Conexión cerrada por:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Conexión establecida con éxito');
        }
    });
}

connectToWhatsApp();
```

---

### Conexión mediante Código de Emparejamiento (Pairing Code)

Si deseas vincular tu número sin escanear un código QR (por ejemplo, en servidores remotos o VPS sin interfaz gráfica):

```javascript
import makeWASocket, { useMultiFileAuthState } from 'baileys';

async function connectWithPairingCode() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    // Si la cuenta no está registrada, solicitar código de emparejamiento
    if (!sock.authState.creds.registered) {
        const phoneNumber = '5491122334455'; // Tu número internacional sin símbolos (+, -)
        setTimeout(async () => {
            const pairingCode = await sock.requestPairingCode(phoneNumber);
            console.log(`📱 Tu código de emparejamiento es: ${pairingCode}`);
        }, 3000);
    }
}

connectWithPairingCode();
```

---

### Sincronización de Historial Completo

Por defecto, WhatsApp sincroniza únicamente los mensajes recientes. Para sincronizar el historial completo de chats:

```javascript
const sock = makeWASocket({
    auth: state,
    syncFullHistory: true
});
```

---

## ⚙️ Configuraciones Clave del Socket

<details open>
<summary><strong>🧠 Caché de Metadatos de Grupos</strong></summary>

Al enviar mensajes a grupos, Baileys necesita conocer los participantes para cifrar los paquetes para cada miembro. Proporcionar una caché en memoria evita consultas de red repetitivas:

```javascript
import { NodeCache } from '@cacheable/node-cache';

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

const sock = makeWASocket({
    auth: state,
    cachedGroupMetadata: async (jid) => groupCache.get(jid)
});

// Guardar o actualizar la caché al recibir metadatos
sock.ev.on('groups.update', async ([event]) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
});
```

</details>

<details>
<summary><strong>🔁 Manejo de Reintentos de Mensajes</strong></summary>

Si un mensaje no puede descifrarse de inmediato, WhatsApp solicita un reintento. Puedes configurar una caché de claves para solventarlo:

```javascript
import { NodeCache } from '@cacheable/node-cache';

const msgRetryCounterCache = new NodeCache();

const sock = makeWASocket({
    auth: state,
    msgRetryCounterCache
});
```

</details>

<details>
<summary><strong>🔔 Recibir Notificaciones en el Teléfono</strong></summary>

Por defecto, cuando WhatsApp Web está activo, el teléfono principal silencia las alertas. Puedes forzar que el teléfono continúe sonando configurando `markOnlineOnConnect: false`:

```javascript
const sock = makeWASocket({
    auth: state,
    markOnlineOnConnect: false
});
```

</details>

---

## 💾 Guardar y Restaurar Sesiones

Baileys incluye el helper nativo `useMultiFileAuthState` para almacenar credenciales y claves de cifrado en una carpeta local de forma segura:

```javascript
import { useMultiFileAuthState } from 'baileys';

// Inicializar estado guardado en el directorio 'auth_info_baileys'
const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

const sock = makeWASocket({
    auth: state
});

// IMPORTANTE: Guardar credenciales cada vez que se actualicen
sock.ev.on('creds.update', saveCreds);
```

> [!TIP]
> Nunca compartas la carpeta de credenciales generada. Contiene las claves privadas criptográficas de tu sesión de WhatsApp.

---

## 📡 Manejo de Eventos

Baileys expone un sistema de eventos mediante `sock.ev`. Puedes escuchar eventos individuales con `.on()` o procesar múltiples eventos en lote con `sock.ev.process()`.

```javascript
// Escuchar mensajes entrantes
sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        console.log(`Mensaje de ${sender}: ${text}`);

        if (text === '!ping') {
            await sock.sendMessage(sender, { text: '¡Pong! 🏓' }, { quoted: msg });
        }
    }
});
```

### Resumen de Eventos Frecuentes

| Evento | Descripción |
|---|---|
| `connection.update` | Cambios en el estado de conexión (`open`, `connecting`, `close`, `qr`). |
| `creds.update` | Actualización de claves y credenciales de autenticación. |
| `messages.upsert` | Mensajes nuevos recibidos o enviados. |
| `messages.update` | Actualizaciones en mensajes (marcas de entrega, lectura, reacciones). |
| `message-receipt.update` | Notificaciones de lectura y confirmación de recepción. |
| `presence.update` | Estado de presencia de usuarios (en línea, escribiendo, grabando). |
| `chats.update` | Cambios en chats (fijados, silenciados, archivados). |
| `groups.update` | Modificaciones en configuración o descripción de grupos. |
| `group-participants.update` | Miembros añadidos, eliminados, promovidos o degradados en grupos. |

---

## 🆔 Estructura de IDs de WhatsApp (JID)

| Tipo de Chat | Formato de JID | Ejemplo |
|---|---|---|
| **Usuario Individual** | `[código_país][número]@s.whatsapp.net` | `5491122334455@s.whatsapp.net` |
| **Grupo** | `[id_grupo]@g.us` | `120363025343200111@g.us` |
| **Canal (Newsletter)** | `[id_canal]@newsletter` | `120363144038483540@newsletter` |
| **Difusión de Estados** | `status@broadcast` | `status@broadcast` |
| **Dispositivo Específico** | `[número]:[id_dispositivo]@s.whatsapp.net` | `5491122334455:2@s.whatsapp.net` |

---

## 💬 Envío de Mensajes

### Mensajes de Texto, Menciones y Citas

```javascript
const jid = '5491122334455@s.whatsapp.net';

// 1. Mensaje de texto simple
await sock.sendMessage(jid, { text: '¡Hola! Este es un mensaje desde Baileys.' });

// 2. Responder / Citar un mensaje recibido
await sock.sendMessage(jid, { text: 'Esta es una respuesta directa' }, { quoted: msgRecibido });

// 3. Mencionar usuarios en un grupo
await sock.sendMessage('120363025343200111@g.us', {
    text: '¡Hola @5491122334455 y @5491188776655!',
    mentions: ['5491122334455@s.whatsapp.net', '5491188776655@s.whatsapp.net']
});

// 4. Mensaje con enlace y vista previa enriquecida
await sock.sendMessage(jid, {
    text: 'Visita el repositorio en https://github.com/muleff/b',
    matchedText: 'https://github.com/muleff/b'
});
```

---

### Mensajes Multimedia

Baileys soporta URLs públicas, rutas locales de archivo (`{ url: './foto.jpg' }`) y `Buffer` binarios.

```javascript
import fs from 'fs';

const jid = '5491122334455@s.whatsapp.net';

// 1. Enviar Imagen con pie de foto (caption)
await sock.sendMessage(jid, {
    image: { url: 'https://picsum.photos/800/600' },
    caption: 'Foto de prueba'
});

// 2. Enviar Video
await sock.sendMessage(jid, {
    video: fs.readFileSync('./video.mp4'),
    caption: 'Video explicativo',
    gifPlayback: false
});

// 3. Enviar GIF animado
await sock.sendMessage(jid, {
    video: { url: './animacion.mp4' },
    gifPlayback: true
});

// 4. Enviar Documento (PDF, ZIP, etc.)
await sock.sendMessage(jid, {
    document: fs.readFileSync('./manual.pdf'),
    mimetype: 'application/pdf',
    fileName: 'Manual_Usuario.pdf'
});

// 5. Enviar Sticker (WebP)
await sock.sendMessage(jid, {
    sticker: fs.readFileSync('./sticker.webp')
});
```

---

### Notas de Voz PTT con Forma de Onda (Waveform)

Puedes enviar audios como notas de voz nativas (Push-To-Talk) e incluir las ondas sonoras visuales:

```javascript
await sock.sendMessage(jid, {
    audio: { url: './audio.ogg' },
    mimetype: 'audio/ogg; codecs=opus',
    ptt: true, // Se muestra como nota de voz con micrófono verde
    waveform: [0, 20, 50, 90, 100, 70, 40, 20, 5, 0] // Barras de onda sonoras
});
```

---

### Ubicación y Contactos (vCard)

```javascript
// Enviar Ubicación geográfica
await sock.sendMessage(jid, {
    location: {
        degreesLatitude: -34.6037,
        degreesLongitude: -58.3816,
        name: 'Obelisco de Buenos Aires',
        address: 'Av. 9 de Julio, CABA, Argentina'
    }
});

// Enviar Tarjeta de Contacto (vCard)
const vcard = 'BEGIN:VCARD\n'
    + 'VERSION:3.0\n'
    + 'FN:Juan Pérez\n'
    + 'ORG:Mi Empresa;\n'
    + 'TEL;type=CELL;type=VOICE;waid=5491122334455:+54 9 11 2233-4455\n'
    + 'END:VCARD';

await sock.sendMessage(jid, {
    contacts: {
        displayName: 'Juan Pérez',
        contacts: [{ vcard }]
    }
});
```

---

### Reacciones y Reenvíos

```javascript
// Reaccionar a un mensaje existente
await sock.sendMessage(jid, {
    react: {
        text: '🔥', // Emoji de reacción (o '' para eliminar la reacción)
        key: msgRecibido.key
    }
});

// Reenviar un mensaje existente
await sock.sendMessage(jid, {
    forward: msgRecibido
});
```

---

### Encuestas Interactivas y Votos

```javascript
import { getAggregateVotesInPollMessage } from 'baileys';

// Crear una Encuesta
await sock.sendMessage(jid, {
    poll: {
        name: '¿Qué lenguaje prefieres para bots?',
        values: ['JavaScript', 'TypeScript', 'Python', 'Go'],
        selectableCount: 1 // 1 para opción única, >1 para selección múltiple
    }
});

// Descifrar votos al recibir actualizaciones
sock.ev.on('messages.update', async ([update]) => {
    if (update.update.pollUpdates) {
        const pollCreation = await getMessageFromStore(update.key); // Mensaje original de la encuesta
        if (pollCreation) {
            const votes = getAggregateVotesInPollMessage({
                message: pollCreation.message,
                pollUpdates: update.update.pollUpdates
            });
            console.log('Resultados actuales de la encuesta:', votes);
        }
    }
});
```

---

### 📅 Eventos de WhatsApp en Grupos

Baileys permite crear eventos programados directamente en chats grupales con enlaces automáticos a llamadas:

```javascript
const grupoJid = '120363025343200111@g.us';

await sock.sendMessage(grupoJid, {
    event: {
        name: 'Reunión de Lanzamiento v7',
        description: 'Discusión y despliegue de las nuevas características de Baileys.',
        startDate: new Date(Date.now() + 3600000), // En 1 hora
        endDate: new Date(Date.now() + 7200000),   // En 2 horas
        location: { name: 'Google Meet / Discord' },
        call: 'video' // 'video' o 'audio' para generar enlace de llamada integrada
    }
});
```

---

### 📌 Fijar Mensajes (Pin) con Duración

Fija mensajes en cualquier conversación especificando su tiempo de expiración:

```javascript
await sock.sendMessage(jid, {
    pin: {
        type: 1, // 1 = Fijar mensaje, 2 = Desfijar mensaje
        time: 86400, // 86400 = 24 Horas | 604800 = 7 Días | 2592000 = 30 Días
        key: msgRecibido.key
    }
});
```

---

### Mensajes de Visualización Única (View Once)

```javascript
// Imagen de una sola visualización
await sock.sendMessage(jid, {
    image: { url: './secreto.jpg' },
    viewOnce: true,
    caption: 'Este mensaje solo se puede abrir una vez'
});
```

---

## ✏️ Modificación y Eliminación de Mensajes

```javascript
// 1. Eliminar mensaje para todos
await sock.sendMessage(jid, {
    delete: msgRecibido.key
});

// 2. Editar un mensaje enviado previamente
await sock.sendMessage(jid, {
    text: 'Texto corregido y actualizado',
    edit: msgEnviado.key
});
```

---

## 📥 Descarga de Archivos Multimedia

Para descargar archivos multimedia de mensajes entrantes (fotos, videos, audios, documentos):

```javascript
import { downloadMediaMessage } from 'baileys';
import fs from 'fs';

sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const messageType = Object.keys(msg.message)[0];
    if (['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(messageType)) {
        // Descargar contenido en memoria como Buffer
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            }
        );

        fs.writeFileSync('./archivo_descargado', buffer);
        console.log('✅ Archivo multimedia descargado correctamente');
    }
});
```

---

## 🌐 Estados y Presencia en el Chat

```javascript
const jid = '5491122334455@s.whatsapp.net';

// Enviar estado de presencia
await sock.sendPresenceUpdate('composing', jid); // "Escribiendo..."
await sock.sendPresenceUpdate('recording', jid); // "Grabando audio..."
await sock.sendPresenceUpdate('paused', jid);    // Detener estado
await sock.sendPresenceUpdate('available');      // En línea
await sock.sendPresenceUpdate('unavailable');    // Desconectado
```

---

## 🗂️ Modificación y Gestión de Chats

```javascript
const jid = '5491122334455@s.whatsapp.net';

// 1. Silenciar chat por 8 horas
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid);

// 2. Quitar silencio de un chat
await sock.chatModify({ mute: null }, jid);

// 3. Fijar chat en la parte superior
await sock.chatModify({ pin: true }, jid);

// 4. Archivar chat
await sock.chatModify({ archive: true }, jid);

// 5. Marcar chat como no leído
await sock.chatModify({ markRead: false, lastMessages: [msgRecibido] }, jid);

// 6. Destacar un mensaje con estrella
await sock.star(jid, [msgRecibido.key], true); // true = destacar, false = quitar
```

---

## 👥 Administración de Grupos

<details open>
<summary><strong>🍃 Operaciones de Grupo</strong></summary>

```javascript
// 1. Crear un grupo
const grupo = await sock.groupCreate('Nuevo Grupo Baileys', [
    '5491122334455@s.whatsapp.net',
    '5491188776655@s.whatsapp.net'
]);
console.log('Grupo creado con ID:', grupo.id);

// 2. Añadir o eliminar participantes
await sock.groupParticipantsUpdate(grupo.id, ['5491122334455@s.whatsapp.net'], 'add');
await sock.groupParticipantsUpdate(grupo.id, ['5491122334455@s.whatsapp.net'], 'remove');

// 3. Promover a administrador o degradar
await sock.groupParticipantsUpdate(grupo.id, ['5491122334455@s.whatsapp.net'], 'promote');
await sock.groupParticipantsUpdate(grupo.id, ['5491122334455@s.whatsapp.net'], 'demote');

// 4. Cambiar asunto y descripción
await sock.groupUpdateSubject(grupo.id, 'Nuevo Título del Grupo');
await sock.groupUpdateDescription(grupo.id, 'Descripción actualizada del grupo');

// 5. Ajustes de grupo: solo administradores pueden enviar mensajes
await sock.groupSettingUpdate(grupo.id, 'announcement'); // 'not_announcement' para todos

// 6. Enlace de invitación al grupo
const codigoInvitacion = await sock.groupInviteCode(grupo.id);
console.log(`Enlace: https://chat.whatsapp.com/${codigoInvitacion}`);
```

</details>

---

## 📢 Canales de WhatsApp (Newsletters)

Baileys incluye soporte nativo completo para interactuar con canales de WhatsApp:

```javascript
// 1. Crear un canal
const nuevoCanal = await sock.newsletterCreate(
    'Comunidad Baileys',
    'Canal oficial para anuncios y actualizaciones.'
);
console.log('Canal creado:', nuevoCanal.id);

// 2. Obtener información de un canal mediante su JID o enlace de invitación
const infoCanal = await sock.newsletterMetadata('JID', '120363144038483540@newsletter');
// O por código de invitación:
// const infoCanal = await sock.newsletterMetadata('INVITE', 'codigoInvitacion');
console.log('Nombre:', infoCanal.name, 'Suscriptores:', infoCanal.subscribers);

// 3. Seguir y dejar de seguir un canal
await sock.newsletterFollow('120363144038483540@newsletter');
await sock.newsletterUnfollow('120363144038483540@newsletter');

// 4. Silenciar y reactivar notificaciones del canal
await sock.newsletterMute('120363144038483540@newsletter');
await sock.newsletterUnmute('120363144038483540@newsletter');

// 5. Enviar mensaje a un canal propio
await sock.sendMessage('120363144038483540@newsletter', {
    text: '📢 ¡Bienvenidos al canal de noticias!'
});
```

---

## 🌐 Comunidades de WhatsApp

Administra comunidades de WhatsApp vinculando grupos subordinados:

```javascript
// 1. Crear una comunidad
const comunidad = await sock.communityCreate(
    'Comunidad Global',
    'Comunidad principal que agrupa múltiples salas temáticas.'
);
console.log('Comunidad creada:', comunidad.id);

// 2. Vincular grupos existentes a la comunidad
await sock.communityLinkGroup(comunidad.id, [
    '120363025343200111@g.us',
    '120363025343200222@g.us'
]);

// 3. Obtener grupos vinculados
const gruposVinculados = await sock.communityFetchLinkedGroups(comunidad.id);
console.log('Grupos en la comunidad:', gruposVinculados);

// 4. Desvincular un grupo
await sock.communityUnlinkGroup(comunidad.id, '120363025343200222@g.us');
```

---

## 📞 Llamadas y Enlaces Directos

Genera enlaces de llamada de WhatsApp para reuniones o eventos:

```javascript
// Crear enlace para llamada de audio o video
const enlaceLlamada = await sock.createCallLink('video');
console.log(`Únete a la llamada mediante: ${enlaceLlamada}`);

// Rechazar una llamada entrante
sock.ev.on('call', async ([call]) => {
    if (call.status === 'offer') {
        await sock.rejectCall(call.id, call.from);
        console.log(`Llamada rechazada de ${call.from}`);
    }
});
```

---

## 🔒 Privacidad y Bloqueos

```javascript
// 1. Obtener y actualizar lista de bloqueados
const bloqueados = await sock.fetchBlocklist();
await sock.updateBlockStatus('5491122334455@s.whatsapp.net', 'block');   // Bloquear
await sock.updateBlockStatus('5491122334455@s.whatsapp.net', 'unblock'); // Desbloquear

// 2. Configurar privacidad de última vez (Last Seen)
await sock.updateLastSeenPrivacy('contacts'); // 'all' | 'contacts' | 'contact_blacklist' | 'none'

// 3. Configurar privacidad de foto de perfil
await sock.updateProfilePicturePrivacy('all');

// 4. Configurar confirmaciones de lectura (tildes azules)
await sock.updateReadReceiptsPrivacy('all'); // 'all' | 'none'
```

---

## 🌱 Créditos y Agradecimientos

- **WhiskeySockets / Baileys**: Desarrolladores y mantenedores originales de la librería base ([Repositorio Oficial](https://github.com/WhiskeySockets/Baileys)).
- **Rajeh Taher & Colaboradores**: Arquitectura de sockets y protocolos criptográficos de Baileys.
- **DuarteXV**: Inspiración estética y diseño de documentación en Markdown ([Yuta-Okkotsu-Bot-MD](https://github.com/DuarteXV/Yuta-Okkotsu-Bot-MD)).
- **muleff**: *Curioso* que clonó y compiló el repositorio a JavaScript puro y configuró la automatización de CI.

---

## ⚠️ Descargo de Responsabilidad (Disclaimer)

Este proyecto **no** está afiliado, asociado, autorizado, respaldado ni conectado de ninguna manera oficial con WhatsApp LLC, Meta Platforms Inc., ni con ninguna de sus subsidiarias o entidades afiliadas.

El sitio web oficial de WhatsApp se encuentra en [whatsapp.com](https://whatsapp.com). "WhatsApp", así como los nombres, marcas, logotipos e imágenes asociados, son marcas registradas de sus respectivos propietarios.

El uso de esta librería debe realizarse bajo su propia responsabilidad, respetando en todo momento los Términos de Servicio y Políticas de Uso de WhatsApp. No utilice esta herramienta para el envío masivo de mensajes no solicitados (spam), acoso o prácticas maliciosas.
