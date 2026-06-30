import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
export const cardRoutes = Router();

cardRoutes.use(authenticate);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const createCardSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().optional(),
    assigneeId: z.string().optional(),
    color: z.string().optional(),
    listId: z.string().min(1),
  }),
});

// POST /api/cards
cardRoutes.post('/', validate(createCardSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, priority, dueDate, assigneeId, color, listId } = req.body;
    const userId = req.userId!;

    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) return res.status(404).json({ error: '列表不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId } },
    });
    if (!member || member.role === 'VIEWER') return res.status(403).json({ error: '无权操作' });

    const lastCard = await prisma.card.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });

    const card = await prisma.card.create({
      data: {
        title,
        description: description || '',
        listId,
        position: (lastCard?.position ?? -1) + 1,
        priority: priority || 'NONE',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        color: color || '',
      },
      include: {
        labels: true,
        assignee: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        boardId: list.boardId,
        userId,
        action: 'CREATE_CARD',
        targetType: 'CARD',
        targetId: card.id,
        detail: `创建了卡片「${title}」`,
      },
    });

    res.status(201).json({ card, boardId: list.boardId });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: '创建卡片失败' });
  }
});

// GET /api/cards/:id
cardRoutes.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const userId = req.userId!;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        labels: true,
        assignee: { select: { id: true, name: true, avatar: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        list: { select: { id: true, title: true, boardId: true } },
      },
    });

    if (!card) return res.status(404).json({ error: '卡片不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId } },
    });
    if (!member) return res.status(403).json({ error: '无权访问' });

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: '获取卡片详情失败' });
  }
});

// PUT /api/cards/:id
cardRoutes.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const userId = req.userId!;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });
    if (!card) return res.status(404).json({ error: '卡片不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId } },
    });
    if (!member || member.role === 'VIEWER') return res.status(403).json({ error: '无权操作' });

    const { title, description, priority, dueDate, assigneeId, color, listId } = req.body;

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(color !== undefined && { color }),
        ...(listId !== undefined && { listId }),
      },
      include: {
        labels: true,
        assignee: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    res.json({ card: updated, boardId: card.list.boardId });
  } catch (error) {
    res.status(500).json({ error: '更新卡片失败' });
  }
});

// DELETE /api/cards/:id
cardRoutes.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const userId = req.userId!;

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });
    if (!card) return res.status(404).json({ error: '卡片不存在' });

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId } },
    });
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN' && member.role !== 'MEMBER')) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.card.delete({ where: { id: cardId } });
    res.json({ success: true, boardId: card.list.boardId });
  } catch (error) {
    res.status(500).json({ error: '删除卡片失败' });
  }
});

// PUT /api/cards/reorder
cardRoutes.put('/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { cardId, fromListId, toListId, position } = req.body;
    await prisma.card.update({
      where: { id: cardId },
      data: { listId: toListId, position },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '移动卡片失败' });
  }
});

// POST /api/cards/:id/comments
cardRoutes.post('/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const userId = req.userId!;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: '评论内容不能为空' });

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });
    if (!card) return res.status(404).json({ error: '卡片不存在' });

    const comment = await prisma.comment.create({
      data: { cardId, userId, content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    await prisma.activityLog.create({
      data: {
        boardId: card.list.boardId,
        userId,
        action: 'ADD_COMMENT',
        targetType: 'CARD',
        targetId: cardId,
        detail: `评论了卡片「${card.title}」`,
      },
    });

    res.status(201).json({ comment, boardId: card.list.boardId });
  } catch (error) {
    res.status(500).json({ error: '添加评论失败' });
  }
});

// POST /api/cards/:id/attachments
cardRoutes.post('/:id/attachments', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const userId = req.userId!;

    if (!req.file) return res.status(400).json({ error: '请选择文件' });

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });
    if (!card) return res.status(404).json({ error: '卡片不存在' });

    const attachment = await prisma.attachment.create({
      data: {
        cardId,
        userId,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: '上传失败' });
  }
});

// POST /api/cards/:id/labels
cardRoutes.post('/:id/labels', async (req: AuthRequest, res: Response) => {
  try {
    const cardId = String(req.params.id);
    const { text, color } = req.body;
    const label = await prisma.cardLabel.create({
      data: { cardId, text: text || '', color: color || '#3B82F6' },
    });
    res.status(201).json(label);
  } catch (error) {
    res.status(500).json({ error: '添加标签失败' });
  }
});

// DELETE /api/cards/:cardId/labels/:labelId
cardRoutes.delete('/:cardId/labels/:labelId', async (req: AuthRequest, res: Response) => {
  try {
    const labelId = String(req.params.labelId);
    await prisma.cardLabel.delete({ where: { id: labelId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除标签失败' });
  }
});
