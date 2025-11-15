import User from '../models/User.js';
import bcryptjs from 'bcryptjs';

export const authenticateUser = async (username, password) => {
  const user = await User.findOne({ username });

  if (!user)
    return { success: false, message: 'שם משתמש או סיסמה שגויים' };

  if (!user.isActive)
    return { success: false, message: 'המשתמש חסום' };

  const match = await user.comparePassword(password);
  if (!match)
    return { success: false, message: 'שם משתמש או סיסמה שגויים' };

  return { success: true, user };
};

export const getAllUsers = async () => {
  return User.find()
    .select('-password')
    .populate('permissions.project', 'name');
};

export const createNewUser = async (data) => {
  const exists = await User.findOne({ username: data.username });
  if (exists)
    return { success: false, message: 'שם המשתמש כבר קיים' };

  const user = new User(data);
  await user.save();

  const clean = await User.findById(user._id)
    .select('-password')
    .populate('permissions.project', 'name');

  return { success: true, user: clean };
};

export const updateUser = async (id, data) => {
  if (data.password)
    data.password = await bcryptjs.hash(data.password, 10);

  return User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  }).select('-password')
    .populate('permissions.project', 'name');
};

export const deleteUser = async (id) => {
  const user = await User.findById(id);
  if (!user)
    return { success: false, status: 404, message: 'משתמש לא נמצא' };

  if (user.role === 'admin') {
    const count = await User.countDocuments({ role: 'admin' });
    if (count <= 1)
      return { success: false, status: 400, message: 'לא ניתן למחוק Admin אחרון' };
  }

  await User.findByIdAndDelete(id);
  return { success: true, message: 'המשתמש נמחק בהצלחה' };
};
