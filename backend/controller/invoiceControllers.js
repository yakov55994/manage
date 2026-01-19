// ===============================================
// INVOICE CONTROLLER – MULTI-PROJECT SYSTEM
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import invoiceService, {
  recalculateRemainingBudget
} from "../services/invoiceService.js";

const invoiceControllers = {
  // ===============================================
  // חיפוש חשבוניות
  // ===============================================
  async searchInvoices(req, res) {
    try {
      const query = req.query.query || req.query.q || "";
      const results = await invoiceService.searchInvoices(query);
      res.json({ success: true, data: results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // קבלת כל החשבוניות לפי הרשאות
  // ===============================================
  async getInvoices(req, res) {
    try {
      const { paymentDate } = req.query;

      // ================================
      //  Accountant → רואה את כל החשבוניות (read-only)
      // ================================
      if (req.user.role === "accountant") {
        let query = {};

        if (paymentDate) {
          const start = new Date(paymentDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(paymentDate);
          end.setHours(23, 59, 59, 999);
          query.paymentDate = { $gte: start, $lte: end };
        }

        // רואת חשבון רואה את כל החשבוניות במערכת
        const invoices = await Invoice.find(query)
          .populate("supplierId", "name phone bankDetails business_tax")
          .populate("fundedFromProjectId")
          .sort({ createdAt: -1 });

        return res.json({ success: true, data: invoices });
      }

      // ================================
      //  שאר המשתמשים → רגיל
      // ================================
      let invoices = await invoiceService.getInvoices(req.user);

      // סינון ידני אם הסרוויס מחזיר הכל (Fallback)
      if (paymentDate) {
        const checkDate = new Date(paymentDate).toISOString().split('T')[0];
        invoices = invoices.filter(inv =>
          inv.paymentDate && new Date(inv.paymentDate).toISOString().split('T')[0] === checkDate
        );
      }

      return res.json({ success: true, data: invoices });

    } catch (err) {
      console.error("getInvoices ERROR:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },


  // ===============================================
  // קבלת חשבונית לפי ID
  // ===============================================
  async getInvoiceById(req, res) {
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
  async createInvoice(req, res) {

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
  async updateInvoice(req, res) {
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
  async updatePaymentStatus(req, res) {
    try {
      const { status, paymentDate, paymentMethod, checkNumber, checkDate } = req.body;

      const updated = await invoiceService.updatePaymentStatus(
        req.user,
        req.params.id,
        status,
        paymentDate,
        paymentMethod,
        checkNumber,
        checkDate
      );

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error("❌ PAYMENT UPDATE ERROR:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // העברת חשבונית בין פרויקטים (תמיכה במספר פרויקטים!)
  // ===============================================
  async moveInvoice(req, res) {
    try {
      const { fromProjectId, toProjectId, fundedFromProjectId, targetProjects, fundedFromProjectIds } = req.body;

      const updated = await invoiceService.moveInvoice(
        req.user,
        req.params.id,
        fromProjectId,
        toProjectId,
        fundedFromProjectId,
        targetProjects,
        fundedFromProjectIds
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
  async deleteInvoice(req, res) {
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

  // ===============================================
  // עדכון סטטוס תשלום מרובה (bulk)
  // ===============================================
  async bulkUpdatePaymentStatus(req, res) {
    try {
      const { invoiceIds, status, paymentDate, paymentMethod, checkNumber, checkDate } = req.body;

      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "חייב לספק מערך של מזהי חשבוניות"
        });
      }

      if (!["כן", "לא", "יצא לתשלום"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "סטטוס לא תקין"
        });
      }

      // בניית אובייקט העדכון
      const updateObj = { paid: status };

      // אם הסטטוס הוא "כן" - הוסף פרטי תשלום
      if (status === "כן") {
        if (paymentDate) {
          updateObj.paymentDate = paymentDate;
        }
        if (paymentMethod) {
          updateObj.paymentMethod = paymentMethod;
        }
        // אם זה צ'ק והוזן מספר צ'ק
        if (paymentMethod === "check" && checkNumber) {
          updateObj.checkNumber = checkNumber;
          if (checkDate) {
            updateObj.checkDate = checkDate;
          }
        }
      }

      // אם הסטטוס הוא "לא" - נקה את כל פרטי התשלום
      if (status === "לא") {
        updateObj.paymentDate = null;
        updateObj.paymentMethod = null;
        updateObj.checkNumber = null;
        updateObj.checkDate = null;
      }

      const updated = await Invoice.updateMany(
        { _id: { $in: invoiceIds } },
        { $set: updateObj }
      );

      res.json({
        success: true,
        updated: updated.modifiedCount,
        message: `עודכנו ${updated.modifiedCount} חשבוניות`
      });
    } catch (err) {
      console.error("❌ BULK UPDATE ERROR:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  },
}
export default invoiceControllers;