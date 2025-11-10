import express from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controller/userController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// כל הנתיבים דורשים admin
router.use(protect, requireAdmin);

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;