import express from 'express'
import userController from '../controller/userController.js';
import { authenticate, requireAdmin  } from '../middleware/auth.js';

const router = express.Router();

// קבלת כל המשתמשים
router.get('/', authenticate, requireAdmin, userController.getAllUsers);

// קבלת משתמש ספציפי
router.get('/:id', authenticate, requireAdmin, userController.getUserById);

// יצירת משתמש חדש
router.post('/', userController.createUser);

// עדכון משתמש
router.put('/:id', userController.updateUser);

// מחיקת משתמש
router.delete('/:id', authenticate, requireAdmin, userController.deleteUser);

// עדכון סטטוס משתמש
router.patch('/:id/status', authenticate, requireAdmin, userController.updateUserStatus);

export default router