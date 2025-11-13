import jwt from 'jsonwebtoken';
import * as userService from '../services/userservice.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'נא למלא שם משתמש וסיסמה' });
    }
    
    // 🆕 כל הלוגיקה בסרוויס
    const result = await userService.authenticateUser(username, password);
    
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    
    // יצירת token
    const token = jwt.sign(
      { id: result.user._id, role: result.user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: result.user._id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'שגיאת שרת', error: error.message });
  }
};

// Create first admin (temporary)
export const createFirstAdmin = async (req, res) => {
  try {
    const result = await userService.createFirstAdmin();
    
    if (!result.success) {
      return res.json({ message: result.message });
    }
    
    res.json({ 
      success: true,
      message: 'Admin created! username: admin, password: 123456',
      data: result.admin
    });
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ message: 'שגיאה בשליפת משתמשים', error: error.message });
  }
};

// Create user
export const createUser = async (req, res) => {
  try {
    const { username, password, email, role, isActive, permissions } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'שם משתמש וסיסמה הם שדות חובה' });
    }
    
    const result = await userService.createNewUser({
      username,
      password,
      email,
      role,
      isActive,
      permissions
    });
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    
    res.status(201).json({ success: true, data: result.user });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ message: 'שגיאה ביצירת משתמש', error: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const user = await userService.updateUser(id, updateData);
    
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ message: 'שגיאה בעדכון משתמש', error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await userService.deleteUser(id);
    
    if (!result.success) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ message: 'שגיאה במחיקת משתמש', error: error.message });
  }
};