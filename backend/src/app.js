const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Message = require('./models/Message');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Conectado a MongoDB');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  }
};

connectDB();

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api', limiter);

const connectedUsers = new Map();
const adminSockets = new Set();
const userMessageCounts = new Map();
const MESSAGE_LIMIT_WINDOW = 60000;
const MAX_MESSAGES_PER_WINDOW = 30;

const getUserMessageCount = (username) => {
  const now = Date.now();
  const userMessages = userMessageCounts.get(username) || [];
  const recentMessages = userMessages.filter(timestamp => now - timestamp < MESSAGE_LIMIT_WINDOW);
  userMessageCounts.set(username, recentMessages);
  return recentMessages.length;
};

const addMessageToCount = (username) => {
  const messages = userMessageCounts.get(username) || [];
  messages.push(Date.now());
  userMessageCounts.set(username, messages);
};

const isMessageAllowed = (username) => {
  return getUserMessageCount(username) < MAX_MESSAGES_PER_WINDOW;
};

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  socket.on('join_room', ({ username, room, isAdmin = false }) => {
    socket.username = username;
    socket.currentRoom = room;
    socket.isAdmin = isAdmin;
  
    if (isAdmin) {
      adminSockets.add(socket.id);
      socket.join('admin');
      Array.from(new Set(Array.from(connectedUsers.values()).map(u => u.room)))
        .forEach(existingRoom => socket.join(existingRoom));
    }
  
    socket.join(room);
  
    connectedUsers.set(socket.id, {
      username,
      room,
      isConnected: true,
      isAdmin,
      lastActivity: Date.now()
    });
  
    const systemMessage = {
      _id: new mongoose.Types.ObjectId(),
      room: room,
      author: 'Sistema',
      content: `${username} se ha unido al chat`,
      timestamp: new Date(),
      isSystemMessage: true
    };
  
    socket.to(room).emit('receive_message', systemMessage);
  
    const allUsers = Array.from(connectedUsers.values())
      .map(({ username, room, isConnected, isAdmin }) => ({
        username,
        room,
        isConnected,
        isAdmin
      }));
  
    io.to('admin').emit('users_list', allUsers);
  });

  socket.on('send_message', async (messageData, callback) => {
    try {
      const newMessage = new Message({
        room: messageData.room,
        author: socket.username,
        content: messageData.content.trim(),
        timestamp: new Date(),
        isAdminMessage: socket.isAdmin,
        recipient: messageData.recipient || null
      });

      await newMessage.save();

      if (messageData.recipient) {
        const recipientSocket = Array.from(connectedUsers.entries())
          .find(([_, user]) => user.username === messageData.recipient)?.[0];

        if (recipientSocket) {
          io.to(recipientSocket).emit('receive_message', newMessage);
        }
      } else {
        io.to(messageData.room).emit('receive_message', newMessage);
      }

      io.to('admin').emit('receive_message', newMessage);

      callback(null);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      callback({ error: 'Error al procesar el mensaje' });
    }
  });

  app.get('/api/messages/:room', async (req, res) => {
    try {
      const { room } = req.params;
      let query = { room };

      const isUserRoom = Array.from(connectedUsers.values())
        .some(user => user.username === room);

      if (isUserRoom) {
        query = {
          $or: [
            { recipient: room },
            { author: room }
          ]
        };
      }

      const messages = await Message.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .exec();

      res.json(messages.reverse());
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      res.status(500).json({ error: 'Error al obtener mensajes' });
    }
  });

  socket.on('typing', ({ username, room }) => {
    if (socket.username === username) {
      socket.to(room).emit('user_typing', { username });
    }
  });

  socket.on('stop_typing', ({ username, room }) => {
    if (socket.username === username) {
      socket.to(room).emit('user_stop_typing', { username });
    }
  });

  socket.on('get_users', () => {
    const allUsers = Array.from(connectedUsers.values())
      .map(({ username, room, isConnected, isAdmin }) => ({
        username,
        room,
        isConnected,
        isAdmin
      }));

    socket.emit('users_list', allUsers);
  });

  socket.on('disconnect', () => {
    if (socket.username && socket.currentRoom) {
      if (socket.isAdmin) {
        adminSockets.delete(socket.id);
      }

      const systemMessage = {
        _id: new mongoose.Types.ObjectId(),
        room: socket.currentRoom,
        author: 'Sistema',
        content: `${socket.username} ha abandonado el chat`,
        timestamp: new Date(),
        isSystemMessage: true
      };

      io.to(socket.currentRoom).emit('receive_message', systemMessage);
      connectedUsers.delete(socket.id);

      const allUsers = Array.from(connectedUsers.values())
        .map(({ username, room, isConnected, isAdmin }) => ({
          username,
          room,
          isConnected,
          isAdmin
        }));

      io.to('admin').emit('users_list', allUsers);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [socketId, userInfo] of connectedUsers.entries()) {
    if (now - userInfo.lastActivity > 30 * 60 * 1000) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      connectedUsers.delete(socketId);
    }
  }
}, 60000);

process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Promesa rechazada no manejada:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor ejecutándose en el puerto ${PORT}`));