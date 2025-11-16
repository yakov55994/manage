import User from "../models/User.js";
import bcryptjs from "bcryptjs";

export const authenticateUser = async (username, password) => {
  const user = await User.findOne({ username });

  if (!user) return { success: false, message: "שם משתמש או סיסמה שגויים" };

  const match = await user.comparePassword(password);
  if (!match) return { success: false, message: "שם משתמש או סיסמה שגויים" };

  return { success: true, user };
};

export const getAllUsers = () => {
  return User.find().populate("permissions.project", "name").select("-password");
};

export const createNewUser = async (data) => {
  const user = await User.create(data);
  return { success: true, user };
};


export const updateUser = async (id, data) => {

  // Hash password if updated
  if (data.password) {
    data.password = await bcryptjs.hash(data.password, 10);
  }

  // ❗ אל תמחק/תמיר permissions
  // אתה מקבל מה-Frontend בדיוק מה שהסכמה דורשת

  const updated = await User.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  )
    .populate("permissions.project", "name")
    .select("-password");

  return updated;
};


export const deleteUser = async (id) => {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return { success: false, message: "משתמש לא נמצא" };
  return { success: true, message: "משתמש נמחק" };
};
