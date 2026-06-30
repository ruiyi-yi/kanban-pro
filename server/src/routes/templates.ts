import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const templateRoutes = Router();

templateRoutes.use(authenticate);

// GET /api/templates
templateRoutes.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.boardTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // If no templates exist, return defaults
    if (templates.length === 0) {
      return res.json([
        {
          id: 'scrum',
          name: 'Scrum 开发',
          description: '适用于敏捷开发团队的 Scrum 模板',
          category: 'DEVELOPMENT',
          defaultLists: JSON.stringify(['待办事项', 'Sprint Backlog', '进行中', '测试中', '已完成']),
        },
        {
          id: 'bug-tracking',
          name: 'Bug 追踪',
          description: 'Bug 提交、分配、修复流程',
          category: 'DEVELOPMENT',
          defaultLists: JSON.stringify(['已报告', '确认中', '修复中', '待验证', '已关闭']),
        },
        {
          id: 'okr',
          name: 'OKR 目标管理',
          description: '季度目标和关键结果跟踪',
          category: 'MANAGEMENT',
          defaultLists: JSON.stringify(['目标', '关键结果', '本周任务', '进行中', '已完成']),
        },
      ]);
    }

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: '获取模板失败' });
  }
});
