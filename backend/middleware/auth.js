import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing token" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 👇 חשוב: נטען גם permissions
    const user = await User.findById(decoded.id)
      .select("_id username role permissions isActive");

    if (!user) return res.status(401).json({ message: "Invalid token" });
    if (user.isActive === false) return res.status(403).json({ message: "User is blocked" });

    // ברירות מחדל כדי שלא יהיה undefined
    if (!user.permissions) user.permissions = { mode: "all", projects: [], suppliers: [], ops: {} };

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
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
  // אם Admin → גישה מלאה
  if (req.user?.role === "admin") return next();

  const projectId = req.params.id || req.body.projectId;

  // אם אין זיהוי פרויקט → אפשר להמשיך
  if (!projectId) return next();

  const permissions = req.user?.permissions?.projects || [];

  const allowed = permissions.some(p => p.toString() === projectId.toString());

  if (!allowed) {
    return res.status(403).json({ message: "אין לך הרשאה לפרויקט זה" });
  }

  next();
};

