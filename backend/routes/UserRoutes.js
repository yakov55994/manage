import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import {
  login,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controller/userController.js';

const router = express.Router();

// 🔓 פתוח
router.post('/login', login);

// 🔐 סגור למנהלים בלבד
router.get('/', protect, requireAdmin, getAllUsers);
router.post('/', protect, requireAdmin, createUser);
router.put('/:id', protect, requireAdmin, updateUser);
router.delete('/:id', protect, requireAdmin, deleteUser);

export default router;
