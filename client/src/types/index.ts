// ========== User ==========
export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ========== Board ==========
export interface Board {
  id: string;
  title: string;
  description: string;
  cover: string;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
  lists?: List[];
  members?: BoardMember[];
  _count?: {
    members: number;
    lists: number;
  };
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardRole;
  user: User;
  createdAt: string;
}

export type BoardRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ========== List ==========
export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: Card[];
  createdAt: string;
}

// ========== Card ==========
export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  position: number;
  priority: Priority;
  dueDate: string | null;
  assigneeId: string | null;
  assignee?: User | null;
  color: string;
  labels: CardLabel[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
    attachments: number;
  };
}

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CardLabel {
  id: string;
  cardId: string;
  text: string;
  color: string;
}

// ========== Comment ==========
export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Attachment ==========
export interface Attachment {
  id: string;
  cardId: string;
  userId: string;
  user: User;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// ========== Activity ==========
export interface ActivityLog {
  id: string;
  boardId: string;
  userId: string;
  user: User;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}

// ========== Automation ==========
export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  config: string;
  enabled: boolean;
}

// ========== Template ==========
export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultLists: string; // JSON array
}

// ========== Notification ==========
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}

// ========== Stats ==========
export interface BoardStats {
  totalCards: number;
  completedCards: number;
  completionRate: number;
  cardsByPriority: { priority: string; count: number }[];
  cardsByMember: { userId: string; name: string; count: number }[];
  cardsByList: { listId: string; title: string; count: number }[];
  overdueCards: number;
  recentActivity: ActivityLog[];
}
