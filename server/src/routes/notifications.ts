import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

// GET /api/notifications
notificationRoutes.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

// PUT /api/notifications/:id/read
notificationRoutes.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const notificationId = String(req.params.id);
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '标记已读失败' });
  }
});

// PUT /api/notifications/read-all
notificationRoutes.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '标记全部已读失败' });
  }
});
