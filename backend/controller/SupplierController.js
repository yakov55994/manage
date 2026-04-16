import Supplier from "../models/Supplier.js";
import supplierService from "../services/SupplierService.js";
import { sendError } from "../utils/sendError.js";
import { saveLog, getIp } from "../utils/logger.js";

const supplierController = {

  async searchSuppliers(req, res) {
    try {
      const q = req.query.query || "";
      const suppliers = await supplierService.searchSuppliers(q);
      res.json({ suppliers });
    } catch (err) {
      saveLog({ type: 'error', message: `שגיאה בחיפוש ספקים — ${err.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req) });
      res.status(500).json({ message: err.message });
    }
  },

  // ✅ עדכון - הוסף תמיכה ב-query parameter "type"
  async getAllSuppliers(req, res) {
    try {
      const type = req.query.type; // 🆕 'invoices' | 'orders' | 'both' | null
      const suppliers = await supplierService.getAllSuppliers(type);
      res.json({ success: true, data: suppliers });
    } catch (err) {
      saveLog({ type: 'error', message: `שגיאה בשליפת ספקים — ${err.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req) });
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getAllSuppliersWithoutRestrictions(req, res) {
    try {
      const suppliers = await Supplier.find();
      res.json({ success: true, data: suppliers });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async getSuppliers(req, res) {
  try {
    const type = req.query.type || null;  // ⬅ שלוף את type מה-URL
    const suppliers = await supplierService.getAllSuppliers(type);
    res.json({ success: true, data: suppliers });
  } catch (e) {
    sendError(res, e);
  }
},

  async getSuppliersByProject(req, res) {
    try {
      const suppliers = await supplierService.getSuppliersByProject(
        req.user,
        req.params.projectId
      );
      res.json({ success: true, data: suppliers });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async getSupplierById(req, res) {
    try {
      const supplier = await supplierService.getSupplierById(req.user, req.params.supplierId);
      if (!supplier) throw new Error("לא נמצא");
      res.json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async createSupplier(req, res) {
    try {
      const supplier = await supplierService.createSupplier(req.user, req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async updateSupplier(req, res) {
    try {
      const supplier = await supplierService.updateSupplier(req.user, req.params.supplierId, req.body);
      res.json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async deleteSupplier(req, res) {
    try {
      await supplierService.deleteSupplier(req.user, req.params.supplierId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e, req);
    }
  }

};

export default supplierController;