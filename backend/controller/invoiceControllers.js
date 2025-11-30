import invoiceService from "../services/invoiceService.js";
import { sendError } from "../utils/sendError.js";

const invoiceController = {

  // 🔍 חיפוש חשבוניות
  async searchInvoices(req, res) {
    try {
      const q = req.query.query || "";
      const results = await invoiceService.searchInvoices(q);
      res.json(results);
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ כל החשבוניות לפי הרשאות
  async getInvoices(req, res) {
    try {
      const data = await invoiceService.getInvoices(req.user);
      res.json({ success: true, data });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ בדיקת כפילות
  async checkDuplicate(req, res) {
    try {
      const result = await invoiceService.checkDuplicate(req.query);
      res.json({ success: true, duplicate: result });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✔ חשבונית לפי ID
  async getInvoiceById(req, res) {
    try {
      const invoiceId = req.params.invoiceId;
      const invoice = await invoiceService.getInvoiceById(req.user, invoiceId);

      if (!invoice) {
        return res.status(404).json({ message: "חשבונית לא נמצאה" });
      }

      res.json({ success: true, data: invoice });

    } catch (e) {
      sendError(res, e);
    }
  },

  // ➕ יצירה
  async createInvoice(req, res) {
    try {
      const invoice = await invoiceService.createInvoice(req.user, req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (e) {
      sendError(res, e);
    }
  },

  // ✏️ עדכון
  async updateInvoice(req, res) {
    try {
      const updated = await invoiceService.updateInvoice(
        req.user,
        req.params.invoiceId,
        req.body
      );

      res.json({ success: true, data: updated });

    } catch (e) {
      sendError(res, e);
    }
  },

  // 💸 עדכון סטטוס תשלום
  async updatePaymentStatus(req, res) {
    try {
      const result = await invoiceService.updatePaymentStatus(
        req.user,
        req.params.invoiceId,
        req.body.status,
        req.body.paymentDate,
        req.body.paymentMethod 
      );

      res.json({ success: true, data: result });

    } catch (e) {
      sendError(res, e);
    }
  },

  // 🔄 העברת חשבונית לפרויקט אחר
  async moveInvoice(req, res) {
    try {
      const result = await invoiceService.moveInvoice(
        req.user,
        req.params.invoiceId,
        req.body.newProjectId
      );

      res.json({ success: true, data: result });

    } catch (e) {
      sendError(res, e);
    }
  },

  // 🗑️ מחיקה
  async deleteInvoice(req, res) {
    console.log("req.user: ", req.user)
    try {
      await invoiceService.deleteInvoice(req.user, req.params.invoiceId);
      res.json({ success: true, message: "נמחק בהצלחה" });
    } catch (e) {
      sendError(res, e);
    }
  }
};

export default invoiceController;
