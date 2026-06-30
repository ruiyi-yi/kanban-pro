import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export type BoardRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AutomationTrigger = 'CARD_MOVED' | 'DUE_DATE_APPROACHING' | 'CARD_CREATED';

export type AutomationAction = 'MOVE_CARD' | 'SET_PRIORITY' | 'ASSIGN_MEMBER' | 'SEND_NOTIFICATION';
