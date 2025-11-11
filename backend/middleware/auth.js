// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js';
import { canUser } from '../services/userservice.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("_id username role permissions isActive");

    if (!user) return res.status(401).json({ message: "Invalid token" });
    if (user.isActive === false) return res.status(403).json({ message: "User is blocked" });

    if (!user.permissions) user.permissions = { projects: [] };

    req.user = user;
    req.userId = user._id;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// (לא הכרחי יותר אם אתה משתמש ב-scope.js)
// שמתי כאן להשארת תאימות לאחור בלבד
export const checkProjectPermission = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  const projectId = req.params.id || req.body.projectId;
  if (!projectId) return next();

  const list = req.user?.permissions?.projects || [];
  const allowed = list.some(p => String(p.project?._id || p.project || p) === String(projectId));
  if (!allowed) {
    return res.status(403).json({ message: "אין לך הרשאה לפרויקט זה" });
  }
  next();
};

// אופציונלי: מחלקת authorize כללית אם אתה עדיין קורא לה במקומות מסוימים
export const authorize = ({ resource, action, getProjectId }) => {
  return (req, res, next) => {
    const projectId =
      (typeof getProjectId === 'function' && getProjectId(req)) ||
      req.params.projectId || req.body.projectId || req.query.projectId;

    if (!projectId) {
      return res.status(400).json({ message: 'projectId is required' });
    }

    if (!canUser({ user: req.user, projectId, resource, action })) {
      return res.status(403).json({ message: 'אין לך הרשאות לביצוע פעולה זו' });
    }
    next();
  };
};
