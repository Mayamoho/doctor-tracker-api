import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validation/auth.schema';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
// No `requireAuth`: logout must still revoke the session when the access token
// has already expired.
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
