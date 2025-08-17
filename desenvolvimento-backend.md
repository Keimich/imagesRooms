# Contexto de Desenvolvimento: Backend da Lousa Colaborativa

Este documento resume o estado atual do backend da aplicação para ser usado como contexto em futuras sessões de desenvolvimento.

## 1. Requisitos e Arquitetura

- **Objetivo:** Criar um backend para uma lousa digital colaborativa em tempo real.
- **Funcionalidades:**
  - Criação de salas com IDs únicos.
  - Múltiplos usuários por sala.
  - Adicionar, mover, redimensionar e deletar imagens.
  - Sincronização em tempo real entre todos os participantes da sala.
- **Tecnologias Escolhidas:**
  - **Runtime:** Node.js
  - **Servidor:** Express.js
  - **Comunicação Real-Time:** Socket.IO
  - **Armazenamento de Estado:** Redis (com expiração de 24 horas por sala)
  - **Orquestração:** Docker e Docker Compose

## 2. Estrutura de Eventos Socket.IO

- **Cliente -> Servidor:**
  - `joinRoom({ roomId, userName })`: Para entrar em uma sala.
  - `imageAdded({ roomId, image })`: Adiciona uma nova imagem.
  - `imageMoved({ roomId, imageId, position })`: Move uma imagem.
  - `imageResized({ roomId, imageId, size })`: Redimensiona uma imagem.
  - `imageDeleted({ roomId, imageId })`: Deleta uma imagem.

- **Servidor -> Cliente:**
  - `currentRoomState(state)`: Enviado ao cliente ao entrar, com todo o estado da sala.
  - `userJoined(user)`: Broadcast para notificar que um novo usuário entrou.
  - `userLeft(user)`: Broadcast para notificar que um usuário saiu.
  - `imageAdded`, `imageMoved`, `imageResized`, `imageDeleted`: Broadcast das ações para sincronizar os clientes.

## 3. Código-Fonte Final

Abaixo estão os conteúdos finais dos arquivos do projeto.

### `package.json`

```json
{
  "name": "imagesrooms",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "redis": "^5.8.1",
    "socket.io": "^4.8.1",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
```

### `redisClient.js`

```javascript
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.on('connect', () => {
  console.log('Conectado ao Redis com sucesso!');
});

client.on('error', (err) => {
  console.error('Erro de conexão com o Redis:', err);
});

client.connect();

async function getRoomState(roomId) {
  try {
    const stateJSON = await client.get(roomId);
    return stateJSON ? JSON.parse(stateJSON) : null;
  } catch (error) {
    console.error(`Erro ao buscar o estado da sala ${roomId}:`, error);
    return null;
  }
}

async function saveRoomState(roomId, state) {
  try {
    const stateJSON = JSON.stringify(state);
    await client.set(roomId, stateJSON, {
      EX: 86400, // 24 horas
    });
  } catch (error) {
    console.error(`Erro ao salvar o estado da sala ${roomId}:`, error);
  }
}

module.exports = {
  redisClient: client,
  getRoomState,
  saveRoomState,
};
```

### `server.js`

```javascript
require('dotenv').config();
const { getRoomState, saveRoomState } = require('./redisClient.js');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.post('/api/rooms', async (req, res) => {
  try {
    const roomId = uuidv4();
    const initialState = { users: [], images: [] };
    await saveRoomState(roomId, initialState);
    res.status(201).json({ roomId });
    console.log(`Sala criada com ID: ${roomId}`);
  } catch (error) {
    console.error('Erro ao criar a sala:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

io.on('connection', (socket) => {
  console.log(`Novo cliente conectado: ${socket.id}`);

  socket.on('joinRoom', async ({ roomId, userName }) => {
    try {
      socket.roomId = roomId;
      socket.userName = userName;
      socket.join(roomId);
      
      let roomState = await getRoomState(roomId) || { users: [], images: [] };
      if (!roomState.users.find(u => u.id === socket.id)) {
        roomState.users.push({ id: socket.id, name: userName });
      }

      await saveRoomState(roomId, roomState);
      socket.emit('currentRoomState', roomState);
      socket.to(roomId).emit('userJoined', { id: socket.id, name: userName });
    } catch (error) {
      console.error(`Erro ao entrar na sala ${roomId}:`, error);
    }
  });

  const imageEventHandler = async (roomId, updateLogic, eventName, payload) => {
    try {
      const roomState = await getRoomState(roomId);
      if (roomState) {
        updateLogic(roomState);
        await saveRoomState(roomId, roomState);
        socket.to(roomId).emit(eventName, payload);
      }
    } catch (error) {
      console.error(`Erro no evento ${eventName}:`, error);
    }
  };

  socket.on('imageAdded', ({ roomId, image }) => imageEventHandler(roomId, s => s.images.push(image), 'imageAdded', image));
  socket.on('imageMoved', ({ roomId, imageId, position }) => imageEventHandler(roomId, s => Object.assign(s.images.find(i=>i.id===imageId), position), 'imageMoved', {imageId, position}));
  socket.on('imageResized', ({ roomId, imageId, size }) => imageEventHandler(roomId, s => Object.assign(s.images.find(i=>i.id===imageId), size), 'imageResized', {imageId, size}));
  socket.on('imageDeleted', ({ roomId, imageId }) => imageEventHandler(roomId, s => {s.images = s.images.filter(i=>i.id!==imageId)}, 'imageDeleted', {imageId}));

  socket.on('disconnect', async () => {
    const { roomId, userName } = socket;
    if (roomId) {
      try {
        const roomState = await getRoomState(roomId);
        if (roomState) {
          roomState.users = roomState.users.filter(user => user.id !== socket.id);
          await saveRoomState(roomId, roomState);
          socket.to(roomId).emit('userLeft', { id: socket.id, name: userName });
        }
      } catch (error) {
        console.error(`Erro ao tratar desconexão:`, error);
      }
    }
  });
});

server.listen(PORT, () => console.log(`Servidor escutando na porta ${PORT}`));
```

### `Dockerfile`

```dockerfile
# Estágio 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Estágio 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
EXPOSE 3000
CMD ["node", "server.js"]
```

### `docker-compose.yml`

```yaml
version: '3.8'
services:
  app:
    build: .
    container_name: whiteboard_app
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - redis
  redis:
    image: "redis:alpine"
    container_name: redis_server
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
volumes:
  redis-data:
```

## 4. Como Executar e Testar

1.  **Executar:** `docker-compose up --build`
2.  **Testar API:** `curl -X POST http://localhost:3000/api/rooms` para criar uma sala.
3.  **Testar WebSocket:** Usar o arquivo `teste.html` para conectar à sala e interagir.
