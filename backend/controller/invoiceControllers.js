import invoiceService from "../services/invoiceService.js";

const invoiceController = {

  // ✔ שליפה של כל החשבוניות בהתאם להרשאות
  async getInvoices(req, res) {
    try {
      const data = await invoiceService.getAllInvoices(req.user);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
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
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async getInvoiceById(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(
        req.user,
        req.params.id
      );

      if (!invoice) return res.status(404).json({ message: "לא נמצא" });
      res.json({ success: true, data: invoice });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
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
    res.status(400).json({ success: false, message: e.message });
  }
},

  async createInvoice(req, res) {
    try {
      const invoice = await invoiceService.createInvoice(req.user, req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
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
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async deleteInvoice(req, res) {
    try {
      await invoiceService.deleteInvoice(req.user, req.params.id);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  },

  async checkDuplicate(req, res) {
    try {
      const exists = await invoiceService.checkDuplicate(req.user, req.query);
      res.json({ success: true, exists });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
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
      res.status(403).json({ success: false, message: e.message });
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
    res.status(403).json({ success: false, message: e.message });
  }
},

};

export default invoiceController;
