import PendingInvoice from "../models/PendingInvoice.js";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import path from "path";

const pendingInvoiceController = {

  // POST /api/pending-invoices/submit — ציבורי, ללא אימות
  submitPublicInvoice: async (req, res) => {
    try {
      const {
        supplierName, supplierTaxId, supplierAddress, supplierPhone, supplierEmail,
        bankName, bankBranch, bankAccount,
        invoiceNumber, invoiceDate, totalAmount, documentType, detail,
      } = req.body;

      if (!supplierName || !supplierTaxId || !invoiceNumber || !invoiceDate || !totalAmount || !documentType) {
        if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "נא למלא את כל השדות החובה" });
      }

      let fileData = null;
      if (req.file) {
        const timestamp = Date.now();
        const safePublicId = `pending_invoice_${timestamp}`;

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "pending_invoices",
          public_id: safePublicId,
          resource_type: "auto",
        });

        fileData = {
          name: req.file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          type: req.file.mimetype,
          size: req.file.size,
        };

        await fs.unlink(req.file.path).catch(() => {});
      }

      const pendingInvoice = new PendingInvoice({
        supplierName: supplierName.trim(),
        supplierTaxId: supplierTaxId.trim(),
        supplierAddress: supplierAddress?.trim() || "",
        supplierPhone: supplierPhone?.trim() || "",
        supplierEmail: supplierEmail?.trim() || "",
        bankName: bankName?.trim() || "",
        bankBranch: bankBranch?.trim() || "",
        bankAccount: bankAccount?.trim() || "",
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: new Date(invoiceDate),
        totalAmount: parseFloat(totalAmount),
        documentType,
        detail: detail?.trim() || "",
        file: fileData,
        status: "ממתין לאישור",
      });

      await pendingInvoice.save();

      res.status(201).json({ message: "החשבונית הוגשה בהצלחה ותיבדק בקרוב" });
    } catch (error) {
      console.error("❌ שגיאה בהגשת חשבונית:", error);
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
      res.status(500).json({ message: "שגיאה בהגשת החשבונית", error: error.message });
    }
  },

  // GET /api/pending-invoices — admin בלבד
  getPendingInvoices: async (req, res) => {
    try {
      const { status } = req.query;
      const filter = {};
      if (status && status !== "הכל") filter.status = status;

      const pendingInvoices = await PendingInvoice.find(filter).sort({ createdAt: -1 });
      res.json(pendingInvoices);
    } catch (error) {
      console.error("❌ שגיאה בטעינת חשבוניות ממתינות:", error);
      res.status(500).json({ message: "שגיאה בטעינת חשבוניות ממתינות" });
    }
  },

  // POST /api/pending-invoices/:id/approve — admin בלבד
  approveInvoice: async (req, res) => {
    try {
      const pendingInvoice = await PendingInvoice.findById(req.params.id);
      if (!pendingInvoice) {
        return res.status(404).json({ message: "חשבונית ממתינה לא נמצאה" });
      }

      const hasBank =
        pendingInvoice.bankName &&
        pendingInvoice.bankBranch &&
        pendingInvoice.bankAccount;

      // חיפוש ספק קיים לפי כל הפרטים
      let supplier = null;
      if (hasBank) {
        supplier = await Supplier.findOne({
          name: pendingInvoice.supplierName,
          business_tax: pendingInvoice.supplierTaxId,
          "bankDetails.bankName": pendingInvoice.bankName,
          "bankDetails.branchNumber": pendingInvoice.bankBranch,
          "bankDetails.accountNumber": pendingInvoice.bankAccount,
        });
      } else {
        supplier = await Supplier.findOne({
          name: pendingInvoice.supplierName,
          business_tax: pendingInvoice.supplierTaxId,
        });
      }

      // יצירת ספק חדש אם לא נמצא
      if (!supplier) {
        const supplierData = {
          name: pendingInvoice.supplierName,
          business_tax: pendingInvoice.supplierTaxId,
          supplierType: "invoices",
          createdByName: req.user?.username || "מערכת",
          createdBy: req.user?._id || undefined,
        };
        if (pendingInvoice.supplierAddress) supplierData.address = pendingInvoice.supplierAddress;
        if (pendingInvoice.supplierPhone) supplierData.phone = pendingInvoice.supplierPhone;
        if (pendingInvoice.supplierEmail) supplierData.email = pendingInvoice.supplierEmail;
        if (hasBank) {
          supplierData.bankDetails = {
            bankName: pendingInvoice.bankName,
            branchNumber: pendingInvoice.bankBranch,
            accountNumber: pendingInvoice.bankAccount,
          };
        }
        supplier = new Supplier(supplierData);
        await supplier.save();
      }

      // יצירת חשבונית
      const files = pendingInvoice.file ? [pendingInvoice.file] : [];

      const invoice = new Invoice({
        invoiceNumber: pendingInvoice.invoiceNumber,
        type: "invoice",
        projects: [],
        totalAmount: pendingInvoice.totalAmount,
        invoiceDate: pendingInvoice.invoiceDate,
        documentType: pendingInvoice.documentType,
        detail: pendingInvoice.detail || "",
        supplierId: supplier._id,
        paid: "לא",
        files,
        status: "לא הוגש",
        createdByName: req.user?.username || "מערכת",
        createdBy: req.user?._id || undefined,
        editHistory: [{
          userName: req.user?.username || "מערכת",
          userId: req.user?._id || undefined,
          action: "created",
          changes: `נוצרה ע״י: הגשה ציבורית, ואושרה ע״י: ${req.user?.username || "מנהל"}`,
        }],
      });

      await invoice.save();

      supplier.invoices.push(invoice._id);
      await supplier.save();

      // מחיקה בלי להפעיל pre-hook (הקובץ עבר לחשבונית)
      await PendingInvoice.findByIdAndDelete(pendingInvoice._id);

      res.json({
        message: "החשבונית אושרה ונוספה למערכת",
        invoiceId: invoice._id,
        supplierId: supplier._id,
      });
    } catch (error) {
      console.error("❌ שגיאה באישור חשבונית:", error);
      res.status(500).json({ message: "שגיאה באישור החשבונית", error: error.message });
    }
  },

  // POST /api/pending-invoices/:id/reject — admin בלבד
  rejectInvoice: async (req, res) => {
    try {
      const { notes } = req.body;
      const pendingInvoice = await PendingInvoice.findByIdAndUpdate(
        req.params.id,
        { status: "לא מאושר", rejectionNotes: notes || "" },
        { new: true }
      );
      if (!pendingInvoice) {
        return res.status(404).json({ message: "חשבונית ממתינה לא נמצאה" });
      }
      res.json({ message: "החשבונית סומנה כלא מאושרת", pendingInvoice });
    } catch (error) {
      console.error("❌ שגיאה בדחיית חשבונית:", error);
      res.status(500).json({ message: "שגיאה בדחיית החשבונית", error: error.message });
    }
  },

  // POST /api/pending-invoices/:id/set-pending — admin בלבד
  setPendingStatus: async (req, res) => {
    try {
      const pendingInvoice = await PendingInvoice.findByIdAndUpdate(
        req.params.id,
        { status: "ממתין לאישור", rejectionNotes: "" },
        { new: true }
      );
      if (!pendingInvoice) {
        return res.status(404).json({ message: "חשבונית ממתינה לא נמצאה" });
      }
      res.json({ message: "החשבונית הוחזרה לממתין לאישור", pendingInvoice });
    } catch (error) {
      console.error("❌ שגיאה בשינוי סטטוס:", error);
      res.status(500).json({ message: "שגיאה בשינוי סטטוס", error: error.message });
    }
  },
};

export default pendingInvoiceController;
