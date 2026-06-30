import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const searchRoutes = Router();

searchRoutes.use(authenticate);

// GET /api/search?q=keyword
searchRoutes.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 1) {
      return res.json({ cards: [], boards: [] });
    }

    // Search cards in boards user has access to
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
        list: {
          board: {
            OR: [
              { ownerId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      },
      include: {
        list: { select: { id: true, title: true, boardId: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        labels: true,
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    // Search boards
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
        AND: {
          OR: [
            { ownerId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ cards, boards });
  } catch (error) {
    res.status(500).json({ error: '搜索失败' });
  }
});
