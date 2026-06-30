import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
export const authRoutes = Router();

// Schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少6位'),
    name: z.string().min(1, '用户名不能为空').max(50),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(1, '请输入密码'),
  }),
});

// POST /api/auth/register
authRoutes.post('/register', validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, avatar: true, createdAt: true },
    });

    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// GET /api/auth/me
authRoutes.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatar: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});
