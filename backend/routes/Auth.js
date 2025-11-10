import express from 'express';
import { login, createInitialAdmin, getMe } from '../controller/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/init-admin', createInitialAdmin); // להרצה פעם אחת בלבד
router.get('/me', protect, getMe);

export default router;