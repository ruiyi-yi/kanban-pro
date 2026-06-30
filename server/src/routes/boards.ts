import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const boardRoutes = Router();

boardRoutes.use(authenticate);

const createBoardSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    cover: z.string().optional(),
  }),
});

// GET /api/boards
boardRoutes.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true, lists: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: '获取看板列表失败' });
  }
});

// POST /api/boards
boardRoutes.post('/', validate(createBoardSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, cover } = req.body;
    const userId = req.userId!;
    const board = await prisma.board.create({
      data: {
        title,
        description: description || '',
        cover: cover || '',
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
        lists: {
          create: [
            { title: '待办', position: 0 },
            { title: '进行中', position: 1 },
            { title: '已完成', position: 2 },
          ],
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                labels: true,
                assignee: { select: { id: true, name: true, avatar: true } },
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });
    res.status(201).json(board);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: '创建看板失败' });
  }
});

// GET /api/boards/:id
boardRoutes.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                labels: true,
                assignee: { select: { id: true, name: true, avatar: true } },
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
      },
    });

    if (!board) return res.status(404).json({ error: '看板不存在或无权访问' });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: '获取看板详情失败' });
  }
});

// PUT /api/boards/:id
boardRoutes.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const userId = req.userId!;
    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ error: '无权修改此看板' });
    }

    const { title, description, cover } = req.body;
    const board = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(cover !== undefined && { cover }),
      },
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: '更新看板失败' });
  }
});

// DELETE /api/boards/:id
boardRoutes.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const board = await prisma.board.findUnique({
      where: { id: boardId, ownerId: req.userId },
    });
    if (!board) return res.status(403).json({ error: '只有看板拥有者可以删除' });

    await prisma.board.delete({ where: { id: boardId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除看板失败' });
  }
});

// POST /api/boards/:id/members
boardRoutes.post('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const userId = req.userId!;
    const { email, role } = req.body;

    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ error: '无权邀请成员' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: '该邮箱未注册' });

    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
    });
    if (existing) return res.status(409).json({ error: '该用户已是看板成员' });

    const member = await prisma.boardMember.create({
      data: { boardId, userId: user.id, role: role || 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: '邀请失败' });
  }
});

// DELETE /api/boards/:id/members/:userId
boardRoutes.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const userId = req.userId!;
    const targetUserId = String(req.params.userId);

    const membership = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ error: '无权移除成员' });
    }

    const target = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });
    if (target?.role === 'OWNER') return res.status(403).json({ error: '不能移除看板拥有者' });

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId: targetUserId } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '移除成员失败' });
  }
});

// GET /api/boards/:id/stats
boardRoutes.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const boardId = String(req.params.id);
    const boardData = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        lists: {
          include: {
            cards: {
              include: { assignee: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!boardData) return res.status(404).json({ error: '看板不存在' });

    const allCards = boardData.lists.flatMap((l) => l.cards);
    const completedList = boardData.lists.find(
      (l) => l.title === '已完成' || l.title === 'Done'
    );
    const completedCards = completedList?.cards.length ?? 0;

    // Cards by priority
    const priorityCount: Record<string, number> = {};
    allCards.forEach((c) => {
      priorityCount[c.priority] = (priorityCount[c.priority] || 0) + 1;
    });

    // Cards by member
    const memberMap: Record<string, { userId: string; name: string; count: number }> = {};
    allCards.forEach((c) => {
      if (c.assignee) {
        if (!memberMap[c.assignee.id]) {
          memberMap[c.assignee.id] = { userId: c.assignee.id, name: c.assignee.name, count: 0 };
        }
        memberMap[c.assignee.id].count++;
      }
    });

    const cardsByList = boardData.lists.map((l) => ({
      listId: l.id, title: l.title, count: l.cards.length,
    }));

    const now = new Date();
    const overdue = allCards.filter((c) => c.dueDate && new Date(c.dueDate) < now).length;

    const recentActivity = await prisma.activityLog.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      totalCards: allCards.length,
      completedCards,
      completionRate: allCards.length > 0 ? Math.round((completedCards / allCards.length) * 100) : 0,
      cardsByPriority: Object.entries(priorityCount).map(([priority, count]) => ({ priority, count })),
      cardsByMember: Object.values(memberMap),
      cardsByList,
      overdueCards: overdue,
      recentActivity,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});
