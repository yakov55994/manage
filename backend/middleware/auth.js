import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ message: 'לא מאומת' });

    const token = header.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('permissions.project', 'name');

    next();
  } catch (e) {
    return res.status(401).json({ message: 'טוקן לא תקין' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'אין הרשאה' });

  next();
};
