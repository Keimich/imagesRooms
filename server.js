require('dotenv').config();
// Importa as funções do redisClient, não apenas o módulo para conexão
const { getRoomState, saveRoomState } = require('./redisClient.js');
const { v4: uuidv4 } = require('uuid');

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>Servidor da Lousa Colaborativa está no ar!</h1>');
});

// Tarefa 4.1: Rota HTTP para criar uma nova sala
app.post('/api/rooms', async (req, res) => {
  try {
    const roomId = uuidv4();
    const initialState = {
      users: [],
      images: [],
    };
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

  socket.on('joinRoom', async ({ roomId, userName, userId }) => {
    try {
      socket.roomId = roomId;
      socket.userName = userName;
      socket.userId = userId; 
      socket.join(roomId);
      
      let roomState = await getRoomState(roomId) || { users: [], images: [] };
      
      const existingUser = roomState.users.find(u => u.userId === userId);

      if (existingUser) {
        existingUser.id = socket.id;
        console.log(`Cliente ${userName} (${userId}) reconectado com novo socket ${socket.id}`);
      } else {
        roomState.users.push({ id: socket.id, name: userName, userId: userId });
        socket.to(roomId).emit('userJoined', { id: socket.id, name: userName, userId: userId });
        console.log(`Cliente ${userName} (${userId}) entrou na sala ${roomId}`);
      }

      await saveRoomState(roomId, roomState);
      
      socket.emit('currentRoomState', roomState);
      io.in(roomId).emit('userListUpdate', roomState.users);

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
        io.in(roomId).emit(eventName, payload);
      }
    } catch (error) {
      console.error(`Erro no evento ${eventName} para a sala ${roomId}:`, error);
    }
  };

  socket.on('imageAdded', ({ roomId, image }) => {
    imageEventHandler(roomId, (state) => state.images.push(image), 'imageAdded', image);
  });

  socket.on('imageMoved', ({ roomId, imageId, position }) => {
    const updateLogic = (state) => {
      const img = state.images.find(i => i.id === imageId);
      if (img) {
        img.x = position.x;
        img.y = position.y;
      }
    };
    imageEventHandler(roomId, updateLogic, 'imageMoved', { imageId, position });
  });

  socket.on('imageResized', ({ roomId, imageId, size }) => {
    const updateLogic = (state) => {
      const img = state.images.find(i => i.id === imageId);
      if (img) {
        img.width = size.width;
        img.height = size.height;
      }
    };
    imageEventHandler(roomId, updateLogic, 'imageResized', { imageId, size });
  });

  socket.on('imageDeleted', ({ roomId, imageId }) => {
    const updateLogic = (state) => {
      state.images = state.images.filter(i => i.id !== imageId);
    };
    imageEventHandler(roomId, updateLogic, 'imageDeleted', { imageId });
  });

  socket.on('disconnect', async () => {
    console.log(`Cliente desconectado: ${socket.id}`);

    const { roomId, userId, userName } = socket;

    if (roomId && userId) {
      try {
        const roomState = await getRoomState(roomId);
        if (roomState) {
          const userWasInRoom = roomState.users.some(u => u.userId === userId);
          
          if (userWasInRoom) {
            roomState.users = roomState.users.filter(user => user.userId !== userId);
            await saveRoomState(roomId, roomState);
            
            io.in(roomId).emit('userListUpdate', roomState.users);
            console.log(`Usuário ${userName} (${userId}) removido da sala ${roomId}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao tratar desconexão da sala ${roomId}:`, error);
      }
    }
  });
});


server.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
