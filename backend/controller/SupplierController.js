// controllers/supplierController.js
import Supplier from "../models/Supplier.js";
import supplierService from "../services/supplierService.js";

const supplierController = {


  async getAllSuppliersWithoutRestrictions(req, res) {
  try {
    const suppliers = await Supplier.find();
    res.json({ success: true, data: suppliers });
  } catch (e) {
  return res.status(403).json({ message: "אין הרשאה" });
}

},

  async getSuppliers(req, res) {
    try {
      const suppliers = await supplierService.getAllSuppliers(req.user);
      res.json({ success: true, data: suppliers });
    } catch (e) {
  return res.status(403).json({ message: "אין הרשאה" });
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
      res.status(403).json({ message: e.message });
    }
  },

  async getSupplierById(req, res) {
    try {
      const supplier = await supplierService.getSupplierById(
        req.user,
        req.params.id
      );

      if (!supplier) return res.status(404).json({ message: "לא נמצא" });

      res.json({ success: true, data: supplier });
    } catch (e) {
      res.status(403).json({ message: e.message });
    }
  },

  async createSupplier(req, res) {
    try {
      const supplier = await supplierService.createSupplier(req.user, req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  async updateSupplier(req, res) {
    try {
      const supplier = await supplierService.updateSupplier(
        req.user,
        req.params.id,
        req.body
      );

      res.json({ success: true, data: supplier });
    } catch (e) {
      res.status(403).json({ message: e.message });
    }
  },

  async deleteSupplier(req, res) {
    try {
      await supplierService.deleteSupplier(req.user, req.params.id);

      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      res.status(403).json({ message: e.message });
    }
  }
};

export default supplierController;
