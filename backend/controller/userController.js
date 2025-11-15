import jwt from 'jsonwebtoken';
import * as userService from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// 🔓 Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await userService.authenticateUser(username, password);
    if (!result.success)
      return res.status(401).json({ message: result.message });

    const token = jwt.sign(
      { id: result.user._id, role: result.user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: result.user._id,
        username: result.user.username,
        role: result.user.role,
        email: result.user.email,
        permissions: result.user.permissions
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'שגיאה בשרת', error: e.message });
  }
};

// 👥 Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ➕ Create new user
export const createUser = async (req, res) => {
  try {
    const result = await userService.createNewUser(req.body);

    if (!result.success)
      return res.status(400).json({ message: result.message });

    res.status(201).json({ success: true, data: result.user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ✏ Update user
export const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);

    if (!user)
      return res.status(404).json({ message: 'משתמש לא נמצא' });

    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ❌ Delete user
export const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);

    if (!result.success)
      return res.status(result.status || 400).json({ message: result.message });

    res.json({ success: true, message: result.message });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
