import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controller/userController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// רק אדמין יכול לנהל משתמשים
router.use(protect, requireAdmin);

// 📃 רשימת משתמשים
router.get('/', getAllUsers);

// ➕ יצירת משתמש
router.post('/', createUser);

// ✏️ עדכון משתמש
router.put('/:id', updateUser);

// 🗑️ מחיקת משתמש
router.delete('/:id', deleteUser);

export default router;
