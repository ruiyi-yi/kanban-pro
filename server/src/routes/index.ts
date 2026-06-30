import { Router } from 'express';
import { authRoutes } from './auth';
import { boardRoutes } from './boards';
import { listRoutes } from './lists';
import { cardRoutes } from './cards';
import { searchRoutes } from './search';
import { templateRoutes } from './templates';
import { notificationRoutes } from './notifications';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/boards', boardRoutes);
router.use('/lists', listRoutes);
router.use('/cards', cardRoutes);
router.use('/search', searchRoutes);
router.use('/templates', templateRoutes);
router.use('/notifications', notificationRoutes);
