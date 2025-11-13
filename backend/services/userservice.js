import User from '../models/User.js';
import bcryptjs from 'bcryptjs';


export const canUser = ({ user, projectId, resource, action }) => {
  // Admin can do everything
  if (user.role === 'admin') return true;
  
  // If no specific permissions - allow all
  const projectsList = user.permissions?.projects || [];
  if (projectsList.length === 0) return true;
  
  // Find project permission
  const projectPerm = projectsList.find(
    p => String(p.project?._id || p.project) === String(projectId)
  );
  
  if (!projectPerm) return false;
  
  // Check module access
  const moduleAccess = projectPerm.modules?.[resource] || projectPerm.access || 'view';
  
  // If action is 'edit', user needs 'edit' permission
  if (action === 'edit') {
    return moduleAccess === 'edit';
  }
  
  // For 'view' action, both 'view' and 'edit' are allowed
  return true;
};
// 🆕 Authenticate user (Login logic)
export const authenticateUser = async (username, password) => {
  console.log('🔍 Looking for user:', username);
  
  const user = await User.findOne({ username });
  console.log('👤 User found:', user ? 'YES' : 'NO');
  
  if (!user) {
    return { success: false, message: 'שם משתמש או סיסמה שגויים' };
  }
  
  if (!user.isActive) {
    return { success: false, message: 'המשתמש חסום' };
  }
  
  console.log('🔐 Checking password...');
  const isMatch = await user.comparePassword(password);
  console.log('🔐 Password match:', isMatch);
  
  if (!isMatch) {
    return { success: false, message: 'שם משתמש או סיסמה שגויים' };
  }
  
  console.log('✅ Authentication successful!');
  return { success: true, user };
};

// 🆕 Create first admin
export const createFirstAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'admin' });
  
  if (existingAdmin) {
    return { success: false, message: 'Admin already exists' };
  }
  
  const admin = new User({
    username: 'admin',
    password: '123456',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true
  });
  
  await admin.save();
  
  return { 
    success: true, 
    admin: { 
      username: admin.username, 
      email: admin.email 
    } 
  };
};

// Find user by username
export const findByUsername = async (username) => {
  return await User.findOne({ username });
};

// Find user by ID
export const findById = async (id) => {
  return await User.findById(id).select('-password');
};

// Count admins
export const countAdmins = async () => {
  return await User.countDocuments({ role: 'admin' });
};

// Get all users
export const getAllUsers = async () => {
  return await User.find()
    .select('-password')
    .populate('permissions.projects.project', 'name')
    .sort('-createdAt');
};

// 🆕 Create new user (with validation)
export const createNewUser = async (data) => {
  // בדוק אם המשתמש כבר קיים
  const existingUser = await findByUsername(data.username);
  if (existingUser) {
    return { success: false, message: 'שם המשתמש כבר קיים' };
  }
  
  const user = new User(data);
  await user.save();
  
  // Return without password
  const createdUser = await User.findById(user._id)
    .select('-password')
    .populate('permissions.projects.project', 'name');
  
  return { success: true, user: createdUser };
};

// Update user
export const updateUser = async (id, updateData) => {
  // אם יש סיסמה חדשה - hash אותה
  if (updateData.password) {
    updateData.password = await bcryptjs.hash(updateData.password, 10);
  }
  
  return await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('permissions.projects.project', 'name');
};

// 🆕 Delete user (with validation)
export const deleteUser = async (id) => {
  const user = await User.findById(id);
  
  if (!user) {
    return { success: false, status: 404, message: 'משתמש לא נמצא' };
  }
  
  // מנע מחיקת admin אחרון
  if (user.role === 'admin') {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return { 
        success: false, 
        status: 400, 
        message: 'לא ניתן למחוק את ה-Admin האחרון' 
      };
    }
  }
  
  await User.findByIdAndDelete(id);
  
  return { success: true, message: 'המשתמש נמחק בהצלחה' };
};