import express from 'express';
import { getLogs, clearLogs } from '../controller/logController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, requireAdmin, getLogs);
router.delete('/', protect, requireAdmin, clearLogs);

export default router;
