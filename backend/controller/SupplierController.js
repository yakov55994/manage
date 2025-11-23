import Supplier from "../models/Supplier.js";
import supplierService from "../services/SupplierService.js";
import { sendError } from "../utils/sendError.js";

const supplierController = {

  async searchSuppliers (req, res) {
  try {
    const q = req.query.query || "";
    const results = await supplierService.searchSuppliers(q);
    res.json(results);
  } catch (e) {
    console.error("❌ searchSuppliers ERROR:", e);
    res.status(500).json({ message: "Search failed" });
  }
},


  async getAllSuppliersWithoutRestrictions(req, res) {
    try {
      const suppliers = await Supplier.find();
      res.json({ success: true, data: suppliers });
    } catch (e) {
      sendError(res, e);
    }
  },

  async getSuppliers(req, res) {
    try {
      const suppliers = await supplierService.getAllSuppliers(req.user);
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
      sendError(res, e);
    }
  },

  async getSupplierById(req, res) {
    try {
      const supplier = await supplierService.getSupplierById(req.user, req.params.supplierId);
      if (!supplier) throw new Error("לא נמצא");
      res.json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e);
    }
  },

  async createSupplier(req, res) {
    try {
      const supplier = await supplierService.createSupplier(req.user, req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updateSupplier(req, res) {
    try {
      const supplier = await supplierService.updateSupplier(req.user, req.params.supplierId, req.body);
      res.json({ success: true, data: supplier });
    } catch (e) {
      sendError(res, e);
    }
  },

  async deleteSupplier(req, res) {
    try {
      await supplierService.deleteSupplier(req.user, req.params.supplierId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e);
    }
  }

};

export default supplierController;
