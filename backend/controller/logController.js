import SystemLog from '../models/SystemLog.js';

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

export const clearLogs = async (req, res) => {
  try {
    await SystemLog.deleteMany({});
    res.json({ success: true, message: 'הלוגים נמחקו בהצלחה' });
  } catch (err) {
    console.error('clearLogs error:', err);
    res.status(500).json({ success: false, message: 'שגיאה במחיקת לוגים' });
  }
};
