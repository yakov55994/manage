import { saveLog, getIp } from './logger.js';

export const sendError = (res, err, req = null) => {
  const msg = err?.message || "שגיאה לא ידועה";

  // 🔐 הרשאות
  if (msg === "אין הרשאה") {
    if (req) saveLog({ type: 'error', message: `גישה נדחתה: ${req.method} ${req.path}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { status: 403, path: req.path, method: req.method } });
    return res.status(403).json({ success: false, message: msg });
  }

  // ❗ לא נמצא
  if (msg === "לא נמצא" || msg.includes("לא נמצא")) {
    return res.status(404).json({ success: false, message: msg });
  }

  // 🟡 שגיאה מצד המשתמש (וולידציה)
  if (msg.includes("לא תקין") || msg.includes("שדה חסר")) {
    return res.status(400).json({ success: false, message: msg });
  }

  // 🟡 שגיאות ולידציה נוספות - סכום לא זהה, חובה לבחור וכו'
  if (msg.includes("סכום") || msg.includes("חובה") || msg.includes("חייב")) {
    return res.status(400).json({ success: false, message: msg });
  }

  // 🔴 שגיאת DB או אחרת
  console.error("❌ SERVER ERROR:", err);
  if (req) saveLog({ type: 'error', message: `שגיאת שרת: ${req.method} ${req.path} — ${msg}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { status: 500, path: req.path, method: req.method, errorMessage: msg } });
  return res.status(500).json({ success: false, message: "שגיאת שרת" });
};
