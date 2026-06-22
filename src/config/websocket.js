import { Server } from 'socket.io';

let io = null;

export const initWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`New Socket.io connection: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket.io disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io server initialized.');
};

export const broadcast = (type, data) => {
  if (!io) return;
  io.emit('message', { type, data });
};
