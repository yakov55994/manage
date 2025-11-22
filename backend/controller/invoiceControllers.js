// controllers/invoiceController.js
import invoiceService from "../services/invoiceService.js";
import { sendError } from "../utils/sendError.js";

const invoiceController = {

  async searchInvoices (req, res) {
  try {
    const q = req.query.query || "";
    const results = await invoiceService.searchInvoices(q);
    res.json(results);
  } catch (e) {
    console.error("❌ searchInvoices ERROR:", e);
    res.status(500).json({ message: "Search failed" });
  }
},

  async getInvoices(req, res) {
    try {
      const data = await invoiceService.getAllInvoices(req.user);
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  async getInvoicesByProject(req, res) {
    try {
      const data = await invoiceService.getInvoicesByProject(
        req.user,
        req.params.projectId
      );
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  async getInvoiceById(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(
        req.user,
        req.params.id
      );
      if (!invoice) throw new Error("לא נמצא");
      res.json({ success: true, data: invoice });
    } catch (e) {
      sendError(res, e);
    }
  },

  async createBulkInvoices(req, res) {
    try {
      const invoices = await invoiceService.createBulkInvoices(
        req.user,
        req.body.invoices
      );
      res.status(201).json({ success: true, data: invoices });
    } catch (e) {
      sendError(res, e);
    }
  },

  async createInvoice(req, res) {
    try {
      const invoice = await invoiceService.createInvoice(req.user, req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updateInvoice(req, res) {
    try {
      const updated = await invoiceService.updateInvoice(
        req.user,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },

  async deleteInvoice(req, res) {
    try {
      await invoiceService.deleteInvoice(req.user, req.params.id);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e);
    }
  },

  async checkDuplicate(req, res) {
    try {
      const exists = await invoiceService.checkDuplicate(req.user, req.query);
      res.json({ success: true, exists });
    } catch (e) {
      sendError(res, e);
    }
  },

  async moveInvoice(req, res) {
    try {
      const updated = await invoiceService.moveInvoice(
        req.user,
        req.params.id,
        req.body.toProjectId
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updatePaymentStatus(req, res) {
    try {
      const updated = await invoiceService.updatePaymentStatus(
        req.user,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },
};

export default invoiceController;
