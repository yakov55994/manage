// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
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

// 🆕 בדיקת הרשאה למודול ספציפי בפרויקט
export const checkModuleAccess = (moduleName, requiredAccess = 'view') => {
  return (req, res, next) => {
    // מנהלים רואים הכל
    if (req.user?.role === 'admin') return next();
    
    const projectId = req.params.id || req.params.projectId || req.body.projectId;
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });
    
    // אם אין הרשאות ספציפיות - גישה לכל
    const list = req.user?.permissions?.projects || [];
    if (list.length === 0) return next();
    
    // מצא הרשאות לפרויקט
    const projectPerm = list.find(p => 
      String(p.project?._id || p.project || p) === String(projectId)
    );
    
    if (!projectPerm) {
      return res.status(403).json({ message: 'אין לך גישה לפרויקט זה' });
    }
    
    // בדיקת הרשאה למודול
    const moduleAccess = projectPerm.modules?.[moduleName] || projectPerm.access || 'view';
    
    if (requiredAccess === 'edit' && moduleAccess !== 'edit') {
      return res.status(403).json({ message: `אין לך הרשאת עריכה ל${moduleName}` });
    }
    
    req.moduleAccess = moduleAccess;
    next();
  };
};

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