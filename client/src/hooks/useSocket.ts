import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import type { Card } from '../types';

export function useSocket(boardId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token || !boardId) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-board', boardId);
    });

    // Real-time card events
    socket.on('card-created', (data) => {
      useBoardStore.getState().addCard(data.listId, data.card);
    });

    socket.on('card-updated', (data) => {
      useBoardStore.getState().updateCard(data.cardId, data.updates);
    });

    socket.on('card-moved', (data) => {
      useBoardStore.getState().moveCard(
        data.cardId,
        data.fromListId,
        data.toListId,
        data.newIndex
      );
    });

    socket.on('card-deleted', (data) => {
      useBoardStore.getState().removeCard(data.cardId);
    });

    socket.on('user-joined', (data) => {
      // Could show a toast notification
      console.log(`User ${data.userId} joined board`);
    });

    return () => {
      socket.emit('leave-board', boardId);
      socket.disconnect();
    };
  }, [token, boardId]);

  return socketRef;
}
