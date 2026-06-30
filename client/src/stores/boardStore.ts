import { create } from 'zustand';
import type { Board, List, Card } from '../types';

interface BoardState {
  // Current board
  currentBoard: Board | null;
  setCurrentBoard: (board: Board | null) => void;

  // Lists and cards
  lists: List[];
  setLists: (lists: List[]) => void;
  addList: (list: List) => void;
  updateList: (listId: string, updates: Partial<List>) => void;
  removeList: (listId: string) => void;

  // Card operations
  addCard: (listId: string, card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
  moveCard: (cardId: string, fromListId: string, toListId: string, newIndex: number) => void;

  // WebSocket connection status
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;
}

export const useBoardStore = create<BoardState>()((set) => ({
  currentBoard: null,
  setCurrentBoard: (board) => set({ currentBoard: board }),

  lists: [],
  setLists: (lists) => set({ lists }),
  addList: (list) => set((state) => ({ lists: [...state.lists, list] })),
  updateList: (listId, updates) =>
    set((state) => ({
      lists: state.lists.map((l) => (l.id === listId ? { ...l, ...updates } : l)),
    })),
  removeList: (listId) =>
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== listId),
    })),

  addCard: (listId, card) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, cards: [...l.cards, card] } : l
      ),
    })),
  updateCard: (cardId, updates) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
      })),
    })),
  removeCard: (cardId) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        cards: l.cards.filter((c) => c.id !== cardId),
      })),
    })),
  moveCard: (cardId, fromListId, toListId, newIndex) =>
    set((state) => {
      const fromList = state.lists.find((l) => l.id === fromListId);
      const card = fromList?.cards.find((c) => c.id === cardId);
      if (!card) return state;

      return {
        lists: state.lists.map((l) => {
          if (l.id === fromListId) {
            return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
          }
          if (l.id === toListId) {
            const newCards = [...l.cards];
            newCards.splice(newIndex, 0, { ...card, listId: toListId });
            return { ...l, cards: newCards };
          }
          return l;
        }),
      };
    }),

  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
