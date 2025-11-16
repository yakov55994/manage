import * as userService from "../services/userservice.js";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv'

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await userService.authenticateUser(username, password);

    if (!result.success)
      return res.status(401).json({ message: result.message });

    const token = jwt.sign(
      { id: result.user._id, role: result.user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
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

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const result = await userService.createNewUser(req.body);
    res.status(201).json({ success: true, data: result.user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);

    if (!updated)
      return res.status(404).json({ message: "משתמש לא נמצא" });

    res.json({ success: true, data: updated });

  } catch (err) {
    console.log("❌ User Update Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);

    if (!result.success)
      return res.status(400).json({ message: result.message });

    res.json({ success: true, message: result.message });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
