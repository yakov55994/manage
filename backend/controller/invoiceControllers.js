// controllers/invoiceController.js
import invoiceService from "../services/invoiceService.js";

const invoiceController = {

  getInvoicesByProject: async (req, res) => {
    try { res.json(await invoiceService.getInvoicesByProject(req.params.projectId)); }
    catch (e) { res.status(500).json({ message: e.message }); }
  },

  createInvoice: async (req, res) => {
    try { res.status(201).json(await invoiceService.createInvoice(req.params.projectId, req.body)); }
    catch (e) { res.status(400).json({ message: e.message }); }
  },

  getInvoiceById: async (req, res) => {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.projectId, req.params.id);
      if (!invoice) return res.status(404).json({ message: "לא נמצא" });
      res.json(invoice);
    } catch (e) { res.status(500).json({ message: e.message }); }
  },

  updateInvoice: async (req, res) => {
    try {
      const updated = await invoiceService.updateInvoice(req.params.projectId, req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "לא נמצא" });
      res.json(updated);
    } catch (e) { res.status(400).json({ message: e.message }); }
  },

  deleteInvoice: async (req, res) => {
    try {
      const deleted = await invoiceService.deleteInvoice(req.params.projectId, req.params.id);
      if (!deleted) return res.status(404).json({ message: "לא נמצא" });
      res.json({ message: "נמחק" });
    } catch (e) { res.status(400).json({ message: e.message }); }
  },

  search: async (req, res) => {
    try { res.json(await invoiceService.search(req.params.projectId, req.query.q)); }
    catch (e) { res.status(500).json({ message: e.message }); }
  },

  updatePaymentStatus: async (req, res) => {
    try {
      res.json(
        await invoiceService.updatePaymentStatus(req.params.projectId, req.params.id, req.body)
      );
    } catch (e) { res.status(400).json({ message: e.message }); }
  },

  updatePaymentDate: async (req, res) => {
    try {
      res.json(
        await invoiceService.updatePaymentDate(req.params.projectId, req.params.id, req.body.date)
      );
    } catch (e) { res.status(400).json({ message: e.message }); }
  },

  moveInvoice: async (req, res) => {
    try {
      res.json(
        await invoiceService.moveInvoice(req.params.id, req.params.projectId, req.body.toProjectId)
      );
    } catch (e) { res.status(400).json({ message: e.message }); }
  },

  checkDuplicate: async (req, res) => {
    try {
      const exists = await invoiceService.checkDuplicate(
        req.params.projectId,
        req.query.supplierName,
        req.query.invoiceNumber
      );
      res.json({ exists: !!exists });
    } catch (e) { res.status(500).json({ message: e.message }); }
  },

  getSupplierInvoices: async (req, res) => {
    try { res.json(await invoiceService.getSupplierInvoices(req.params.id)); }
    catch (e) { res.status(500).json({ message: e.message }); }
  },

};

export default invoiceController;
