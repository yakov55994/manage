import User from '../models/userSchema.js';

// קבלת כל המשתמשים (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('permissions.projects', 'name')
      .sort('-createdAt');

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת משתמשים'
    });
  }
};

// יצירת משתמש חדש (Admin only)
export const createUser = async (req, res) => {
  try {
    const { username, password, email, role, permissions } = req.body;

    // בדיקות
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'שם משתמש וסיסמה הם שדות חובה'
      });
    }

    // בדוק אם שם המשתמש כבר קיים
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'שם משתמש כבר קיים'
      });
    }

    const user = await User.create({
      username,
      password,
      email,
      role: role || 'user',
      permissions: permissions || { projects: [], suppliers: [] }
    });

    // החזר בלי הסיסמה
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('permissions.projects', 'name')

    res.status(201).json({
      success: true,
      data: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת משתמש'
    });
  }
};

// עדכון משתמש (Admin only)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, permissions, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // עדכן שדות
    if (username) user.username = username;
    if (email !== undefined) user.email = email;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // יעבור hash אוטומטי

    await user.save();

    const updatedUser = await User.findById(id)
      .select('-password')
      .populate('permissions.projects', 'name')

    res.json({
      success: true,
      data: updatedUser
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון משתמש'
    });
  }
};

// מחיקת משתמש (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // מנע מחיקת admin אחרון
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן למחוק את ה-Admin האחרון'
        });
      }
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'משתמש נמחק בהצלחה'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'שגיאה במחיקת משתמש'
    });
  }
};