import PendingInvoice from "../models/PendingInvoice.js";
import Invoice from "../models/Invoice.js";
import Supplier from "../models/Supplier.js";
import Project from "../models/Project.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";

const pendingInvoiceController = {

  // GET /api/pending-invoices/projects — ציבורי, רשימת פרויקטים לטופס
  getPublicProjects: async (req, res) => {
    try {
      const projects = await Project.find({}, "_id name").sort({ name: 1 });
      res.json(projects);
    } catch (error) {
      console.error("❌ שגיאה בטעינת פרויקטים:", error);
      res.status(500).json({ message: "שגיאה בטעינת פרויקטים" });
    }
  },

  // POST /api/pending-invoices/submit — ציבורי, ללא אימות
  submitPublicInvoice: async (req, res) => {
    try {
      const {
        submitterName,
        supplierName, supplierTaxId, supplierAddress, supplierPhone, supplierEmail,
        bankName, bankBranch, bankAccount,
        projectId, projectName,
        invoiceNumber, invoiceDate, totalAmount, documentType, detail,
      } = req.body;

      if (!submitterName || !supplierName || !supplierTaxId || !invoiceNumber || !invoiceDate || !totalAmount || !documentType || !bankName || !bankBranch || !bankAccount) {
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
        submitterName: submitterName.trim(),
        supplierName: supplierName.trim(),
        supplierTaxId: supplierTaxId.trim(),
        supplierAddress: supplierAddress?.trim() || "",
        supplierPhone: supplierPhone?.trim() || "",
        supplierEmail: supplierEmail?.trim() || "",
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        bankAccount: bankAccount.trim(),
        projectId: projectId || null,
        projectName: projectName?.trim() || "",
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

      const { supplierDecision, supplierId } = req.body || {};

      const createNewSupplier = async () => {
        const newSupplier = new Supplier({
          name: pendingInvoice.supplierName,
          business_tax: pendingInvoice.supplierTaxId,
          supplierType: "invoices",
          createdByName: req.user?.username || "מערכת",
          createdBy: req.user?._id || undefined,
          ...(pendingInvoice.supplierAddress && { address: pendingInvoice.supplierAddress }),
          ...(pendingInvoice.supplierPhone && { phone: pendingInvoice.supplierPhone }),
          ...(pendingInvoice.supplierEmail && { email: pendingInvoice.supplierEmail }),
          bankDetails: {
            bankName: pendingInvoice.bankName,
            branchNumber: pendingInvoice.bankBranch,
            accountNumber: pendingInvoice.bankAccount,
          },
        });
        await newSupplier.save();
        return newSupplier;
      };

      let supplier;

      if (supplierDecision === "existing" && supplierId) {
        // המשתמש בחר לסנכרן עם ספק קיים שאותר בבדיקת ההתאמה
        supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(404).json({ message: "הספק הנבחר לא נמצא" });
        }
      } else if (supplierDecision === "new") {
        // המשתמש בחר במפורש ליצור ספק חדש למרות ההתאמה שנמצאה
        supplier = await createNewSupplier();
      } else {
        // בדיקה: האם קיים כבר ספק עם אותו מספר חשבון בנק או אותו מספר עוסק/ח.פ.
        const matches = await Supplier.find({
          $or: [
            { "bankDetails.accountNumber": pendingInvoice.bankAccount },
            { business_tax: pendingInvoice.supplierTaxId },
          ],
        });

        if (matches.length > 0) {
          return res.status(409).json({
            requiresSupplierDecision: true,
            message: "נמצא ספק קיים במערכת עם אותו מספר חשבון בנק או מספר עוסק. יש לבחור אם לסנכרן עם הספק הקיים או ליצור ספק חדש.",
            matchedSuppliers: matches.map((s) => ({
              _id: s._id,
              name: s.name,
              business_tax: s.business_tax,
              bankDetails: s.bankDetails,
            })),
          });
        }

        supplier = await createNewSupplier();
      }

      // בניית מערך פרויקטים
      const projects = pendingInvoice.projectId ? [{
        projectId: pendingInvoice.projectId,
        projectName: pendingInvoice.projectName,
        sum: pendingInvoice.totalAmount,
      }] : [];

      const files = pendingInvoice.file ? [pendingInvoice.file] : [];

      const invoice = new Invoice({
        invoiceNumber: pendingInvoice.invoiceNumber,
        type: "invoice",
        projects,
        totalAmount: pendingInvoice.totalAmount,
        invoiceDate: pendingInvoice.invoiceDate,
        documentType: pendingInvoice.documentType,
        detail: pendingInvoice.detail || "",
        invitingName: pendingInvoice.submitterName || "",
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

      // אם הפרויקט קיים — הוסף את החשבונית לפרויקט
      if (pendingInvoice.projectId) {
        await Project.findByIdAndUpdate(pendingInvoice.projectId, {
          $push: { invoices: invoice._id },
        });
      }

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
