import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Kanban Pro server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for real-time collaboration`);
});
