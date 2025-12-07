// ===============================================
// INVOICE CONTROLLER – MULTI-PROJECT SYSTEM
// ===============================================

import Invoice from "../models/Invoice.js";
import invoiceService, {
  recalculateRemainingBudget
} from "../services/invoiceService.js";

const invoiceControllers = {
// ===============================================
// חיפוש חשבוניות
// ===============================================
async searchInvoices (req, res) {
  try {
    const results = await invoiceService.searchInvoices(req.query.q || "");
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
},

// ===============================================
// קבלת כל החשבוניות לפי הרשאות
// ===============================================
async getInvoices  (req, res) {
  try {
    const invoices = await invoiceService.getInvoices(req.user);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
},

// ===============================================
// קבלת חשבונית לפי ID
// ===============================================
async getInvoiceById  (req, res)  {
  try {
    const invoice = await invoiceService.getInvoiceById(req.user, req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: "חשבונית לא נמצאה" });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
},

// ===============================================
// יצירת חשבונית חדשה (מרובת פרויקטים)
// ===============================================
async createInvoice  (req, res)  {
  console.log("✔ Invoice Schema Keys:", Object.keys(Invoice.schema.paths));

  console.log("📥 BODY RECEIVED:", req.body);

  try {
    const invoice = await invoiceService.createInvoice(req.user, req.body);
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error("❌ CREATE ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
},

// ===============================================
// עדכון חשבונית (עדכון פרויקטים, סכומים, קובץ וכו')
// ===============================================
async updateInvoice  (req, res)  {
  try {
    const updated = await invoiceService.updateInvoice(
      req.user,
      req.params.id,
      req.body
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ UPDATE ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
},

// ===============================================
// עדכון סטטוס תשלום
// ===============================================
async updatePaymentStatus  (req, res)  {
  try {
    const { status, paymentDate, paymentMethod } = req.body;

    const updated = await invoiceService.updatePaymentStatus(
      req.user,
      req.params.id,
      status,
      paymentDate,
      paymentMethod
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ PAYMENT UPDATE ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
},

// ===============================================
// העברת חשבונית בין פרויקטים (מותאם למבנה החדש!)
// ===============================================
async moveInvoice  (req, res)  {
  try {
    const { fromProjectId, toProjectId } = req.body;

    const updated = await invoiceService.moveInvoice(
      req.user,
      req.params.id,
      fromProjectId,
      toProjectId
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ MOVE ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
},

// ===============================================
// מחיקת חשבונית (כולל קבצים ותקציב)
// ===============================================
async deleteInvoice  (req, res)  {
  try {
    await invoiceService.deleteInvoice(req.user, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
},
  async checkDuplicate(req, res) {
    try {
      const result = await invoiceService.checkDuplicate(req.query);
      res.json({ success: true, duplicate: result });
    } catch (e) {
      sendError(res, e);
    }
  },
}
export default invoiceControllers;