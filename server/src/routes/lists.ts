import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const listRoutes = Router();

listRoutes.use(authenticate);

const createListSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    boardId: z.string().min(1),
  }),
});

// POST /api/lists
listRoutes.post('/', validate(createListSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, boardId } = req.body;
    const userId = req.userId!;

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member || member.role === 'VIEWER') return res.status(403).json({ error: '无权操作' });

    const lastList = await prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const list = await prisma.list.create({
      data: {
        title,
        boardId,
        position: (lastList?.position ?? -1) + 1,
      },
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
    });

    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ error: '创建列表失败' });
  }
});

// PUT /api/lists/:id
listRoutes.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const listId = String(req.params.id);
    const userId = req.userId!;

    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) return res.status(404).json({ error: '列表不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId } },
    });
    if (!member || member.role === 'VIEWER') return res.status(403).json({ error: '无权操作' });

    const updated = await prisma.list.update({
      where: { id: listId },
      data: { title: req.body.title },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新列表失败' });
  }
});

// DELETE /api/lists/:id
listRoutes.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const listId = String(req.params.id);
    const userId = req.userId!;

    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) return res.status(404).json({ error: '列表不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId } },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return res.status(403).json({ error: '无权删除列表' });
    }

    await prisma.list.delete({ where: { id: listId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除列表失败' });
  }
});

// PUT /api/lists/reorder
listRoutes.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { lists: orderedLists } = req.body;
    const updates = orderedLists.map((item: { id: string; position: number }) =>
      prisma.list.update({ where: { id: item.id }, data: { position: item.position } })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '排序失败' });
  }
});
