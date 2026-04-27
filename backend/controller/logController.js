import SystemLog from '../models/SystemLog.js';
import { getIp } from '../utils/logger.js';

export const getLogs = async (req, res) => {
  try {
    const { type, limit = 100, page = 1 } = req.query;
    const filter = type && type !== 'all' ? { type } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      SystemLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      SystemLog.countDocuments(filter)
    ]);

    res.json({ success: true, logs, total, page: Number(page) });
  } catch (err) {
    console.error('getLogs error:', err);
    res.status(500).json({ success: false, message: 'שגיאה בטעינת לוגים' });
  }
};

export const clientLog = async (req, res) => {
  try {
    const { message, page, meta } = req.body;
    if (!message) return res.status(400).json({ success: false });

    await SystemLog.create({
      type: 'error',
      message: `[ולידציה${page ? ` — ${page}` : ''}] ${message}`,
      username: req.user?.username || req.user?.name,
      userId: req.user?._id,
      ip: getIp(req),
      userAgent: req.headers['user-agent'],
      meta: meta || {},
    });

    res.json({ success: true });
  } catch (err) {
    console.error('clientLog error:', err.message);
    res.status(500).json({ success: false });
  }
};

export const clearLogs = async (req, res) => {
  try {
    await SystemLog.deleteMany({});
    res.json({ success: true, message: 'הלוגים נמחקו בהצלחה' });
  } catch (err) {
    console.error('clearLogs error:', err);
    res.status(500).json({ success: false, message: 'שגיאה במחיקת לוגים' });
  }
};
