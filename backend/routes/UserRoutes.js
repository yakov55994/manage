import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import {
  login,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  sendResetLink,
  verifyResetToken,
  resetPassword,
  forgotPassword  
} from '../controller/userController.js';

const router = express.Router();

// 🔓 נתיבים פתוחים (ללא אימות)
router.get('/verify-reset-token/:token', verifyResetToken); // בדיקת תקינות טוקן
router.post('/reset-password', resetPassword); // איפוס סיסמה
router.post('/forgot-password', forgotPassword);

// 🔐 נתיבים מוגנים - למנהלים בלבד
router.get('/', protect, requireAdmin, getAllUsers);
router.post('/', protect, requireAdmin, createUser);
router.put('/:id', protect, requireAdmin, updateUser);
router.delete('/:id', protect, requireAdmin, deleteUser);
router.post('/send-reset-link', protect, requireAdmin, sendResetLink); // שליחת קישור איפוס

export default router;