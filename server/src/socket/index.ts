import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let io: Server;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:80'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 User connected: ${userId}`);

    // Join board room
    socket.on('join-board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user-joined', {
        userId,
        boardId,
      });
    });

    // Leave board room
    socket.on('leave-board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user-left', {
        userId,
        boardId,
      });
    });

    // Card created
    socket.on('card-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-created', {
        ...data,
        userId,
      });
    });

    // Card updated
    socket.on('card-updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-updated', {
        ...data,
        userId,
      });
    });

    // Card moved (drag & drop)
    socket.on('card-moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-moved', {
        ...data,
        userId,
      });
    });

    // Card deleted
    socket.on('card-deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('card-deleted', {
        ...data,
        userId,
      });
    });

    // List created
    socket.on('list-created', (data) => {
      socket.to(`board:${data.boardId}`).emit('list-created', {
        ...data,
        userId,
      });
    });

    // New comment
    socket.on('comment-added', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment-added', {
        ...data,
        userId,
      });
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`board:${data.boardId}`).emit('user-typing', {
        userId,
        cardId: data.cardId,
        name: data.name,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
