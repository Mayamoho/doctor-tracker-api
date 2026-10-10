import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', dashboardController.stats);
router.get('/filter-options', dashboardController.filterOptions);

export default router;
