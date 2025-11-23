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
  return User.find()
  // .populate("permissions.project", "_id name")
.select("-password");
};

export const createNewUser = async (data) => {
  const user = await User.create(data);
  return { success: true, user };
};


export const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) return null;

  // עדכון שדות רגילים
  if (data.username) user.username = data.username;
  if (data.email) user.email = data.email;
  if (data.role) user.role = data.role;
  if (data.isActive !== undefined) user.isActive = data.isActive;

  // עדכון סיסמה
  if (data.password) {
    user.password = await bcryptjs.hash(data.password, 10);
  }

  // עדכון הרשאות — כאן הקסם:
  if (data.permissions) {
    user.permissions = data.permissions.map(p => ({
      project: p.project,
      access: p.access || "none",
      modules: {
        invoices: p.modules?.invoices || "none",
        orders: p.modules?.orders || "none",
        suppliers: p.modules?.suppliers || "none",
        files: p.modules?.files || "none",
      }
    }));
  }

  await user.save();
  return user.toObject({ getters: true, virtuals: false });
};



export const deleteUser = async (id) => {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return { success: false, message: "משתמש לא נמצא" };
  return { success: true, message: "משתמש נמחק" };
};
