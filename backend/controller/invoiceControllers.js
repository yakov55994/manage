import invoiceService from '../services/invoiceService.js';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary'
import Invoice from '../models/Invoice.js';
import Supplier from '../models/Supplier.js';

const ALLOWED_DOC_TYPES = [
  "ח. עסקה",
  "ה. עבודה",
  "ד. תשלום, חשבונית מס / קבלה",
];

const invoiceControllers = {
  // ✅ בדיקת כפילות חשבונית בפרויקט
  check_duplicate: async (req, res) => {
    const { projectId } = req.params;
    const { supplierName, invoiceNumber } = req.query;

    if (!projectId || !supplierName || !invoiceNumber) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    try {
      const exists = await Invoice.findOne({
        project: projectId,
        invoiceNumber,
        invitingName: supplierName,
      }).select('_id');

      res.json({ exists: !!exists });
    } catch (error) {
      console.error('Error checking duplicate invoice:', error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // ✅ יצירת חשבוניות לפרויקט
  createInvoices: async (req, res) => {
    try {
      const { projectId } = req.params;
      let { invoices } = req.body;

      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      if (!invoices || (Array.isArray(invoices) && invoices.length === 0)) {
        return res.status(400).json({ message: "Invalid invoices data" });
      }
      if (!Array.isArray(invoices)) invoices = [invoices];

      const processedInvoices = invoices.map((invoice) => {
        if (!invoice.invoiceNumber) return null;

        const documentType = (invoice.documentType || "").trim();
        if (!documentType || !ALLOWED_DOC_TYPES.includes(documentType)) return null;

        let files = [];
        if (invoice.files && Array.isArray(invoice.files)) {
          files = invoice.files.map((file) => ({
            name: file?.name || file?.fileName || "unknown",
            url: file?.url || file?.fileUrl || "",
            type: file?.type || file?.fileType || "application/octet-stream",
            size: file?.size || 0,
            publicId: file?.publicId || "",
            resourceType: file?.resourceType || "auto",
          }));
        }

        return {
          ...invoice,
          project: projectId,     // 👈 קובע את הפרויקט
          documentType,
          files,
        };
      }).filter(Boolean);

      if (processedInvoices.length === 0) {
        return res.status(400).json({ message: "No valid invoices to process" });
      }

      const newInvoices = await invoiceService.createInvoices(processedInvoices);

      // עדכון רפרנס אצל ספקים (אופציונלי)
      for (const invoice of newInvoices) {
        if (invoice.supplierId) {
          await Supplier.findByIdAndUpdate(invoice.supplierId, {
            $push: { invoices: invoice._id },
          });
        }
      }

      res.status(201).json(newInvoices);
    } catch (error) {
      console.error("Error in createInvoices:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // ✅ חיפוש בפרויקט
  search: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { query } = req.query;
      const results = await invoiceService.search(projectId, query);
      res.status(200).json(results);
    } catch (error) {
      console.error('שגיאה במהלך החיפוש: ', error);
      res.status(500).json({ message: 'שגיאה במהלך החיפוש', error: error.message });
    }
  },

  // ✅ רשימת חשבוניות בפרויקט (עם עמודים)
  fetchInvoices: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50, q } = req.query;

      const { items, total, pages } = await invoiceService.getInvoicesByProject(projectId, {
        page: Number(page),
        limit: Number(limit),
        q
      });

      return res.status(200).json({
        data: items || [],
        meta: { total: total || 0, page: Number(page), pages: pages || 0 }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "שגיאה בשליפת החשבוניות", error: error.message });
    }
  },

  // ⚠️ אופציונלי בלבד (מומלץ להגביל לאדמין)
  getAllInvoices: async (req, res) => {
    try {
      const invoices = await invoiceService.getAllInvoices();
      return res.status(200).json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת חשבוניות', error: error.message });
    }
  },

  // ✅ חשבונית לפי ID בפרויקט
  getInvoiceById: async (req, res) => {
    const { projectId, id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ה-ID לא תקין" });
    }

    try {
      const invoice = await invoiceService.getInvoiceById(projectId, id);
      if (!invoice) {
        return res.status(404).json({ message: 'החשבונית לא נמצאה' });
      }
      return res.status(200).json(invoice);
    } catch (error) {
      console.error('Error fetching invoice by ID:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת חשבונית', error: error.message });
    }
  },

  // ===== כלי Cloudinary (ללא שינוי מהותי) =====
  debugCloudinaryFile: async (fileUrl, publicId) => {
    try {
      console.log("🔍 DEBUG: Checking file existence in Cloudinary...");
      const searchResult = await cloudinary.search.expression(`public_id:${publicId}`).execute();
      console.log("🔍 Search result:", searchResult);

      if (searchResult.resources && searchResult.resources.length > 0) {
        const resource = searchResult.resources[0];
        return {
          found: true,
          resource_type: resource.resource_type,
          type: resource.type,
          format: resource.format,
          actual_public_id: resource.public_id
        };
      } else {
        return { found: false };
      }
    } catch (error) {
      console.error("🔍 Search error:", error);
      return { found: false, error: error.message };
    }
  },

  deleteFromCloudinary: async (fileUrl) => {
    try {
      const options = [
        fileUrl.split('/upload/')[1]?.replace(/^v\d+\//, '').replace(/\.[^.]+$/, ''),
        `invoices/${fileUrl.split('/').pop().replace(/\.[^.]+$/, '')}`,
        fileUrl.split('/').pop().replace(/\.[^.]+$/, ''),
        `invoices_${fileUrl.split('/').pop().replace(/\.[^.]+$/, '')}`
      ];

      for (const publicId of options) {
        if (!publicId) continue;
        const resourceTypes = ['image', 'raw', 'video'];
        for (const resourceType of resourceTypes) {
          try {
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            if (result.result === 'ok') return result;
          } catch (_) {}
        }
        try {
          const result = await cloudinary.uploader.destroy(publicId);
          if (result.result === 'ok') return result;
        } catch (_) {}
      }
      return { result: 'not found' };
    } catch (error) {
      console.error("💥 Cloudinary deletion error:", error);
      return { result: 'error', error: error.message };
    }
  },

  extractPublicId: (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== 'string') return null;
    const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
    const match = fileUrl.match(regex);
    return match && match[1] ? match[1] : null;
  },

  deleteFile: async (req, res) => {
    try {
      const { publicId, resourceType } = req.body;
      if (!publicId) return res.status(400).json({ error: 'חסר publicId למחיקה.' });

      const typeToDelete = resourceType || 'auto';
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: typeToDelete });

      if (result.result === 'ok') {
        return res.json({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type
        });
      } else if (result.result === 'not found') {
        return res.status(404).json({ error: 'הקובץ לא נמצא בקלאודנירי' });
      } else {
        return res.status(500).json({ error: `מחיקת קלאודנירי נכשלה: ${result.result}` });
      }
    } catch (error) {
      console.error('שגיאת שרת במהלך מחיקה מקלאודנירי:', error);
      return res.status(500).json({ error: 'שגיאת שרת במהלך מחיקת קובץ', details: error.message });
    }
  },

  // ✅ עדכון חשבונית בפרויקט
  updateInvoice: async (req, res) => {
    const { projectId, id } = req.params;
    const updated = await invoiceService.updateInvoiceService(projectId, id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "חשבונית לא נמצאה" });
    }
    res.json({ message: "החשבונית עודכנה בהצלחה", invoice: updated });
  },

  // ✅ עדכון סטטוס תשלום בפרויקט
  updateInvoicePaymentStatus: async (req, res) => {
    const { projectId, id } = req.params;
    const { paid, paymentDate, paymentMethod } = req.body; 
    try {
      const updatedInvoice = await invoiceService.updatePaymentStatusService(
        projectId,
        id,
        { paid, paymentDate, paymentMethod }
      );
      if (!updatedInvoice) {
        return res.status(404).json({ message: "חשבונית לא נמצאה" });
      }
      return res.status(200).json(updatedInvoice);
    } catch (error) {
      console.error("updateInvoicePaymentStatus error:", error);
      return res.status(400).json({ message: error.message || "שגיאה בעדכון החשבונית" });
    }
  },

  // ✅ עדכון תאריך תשלום בפרויקט
  updateInvoicePaymentDate: async (req, res) => {
    const { projectId, id } = req.params;
    const { paid, paymentDate } = req.body;
    try {
      const updatedInvoice = await invoiceService.updatePaymentDate(projectId, id, paid, paymentDate);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "חשבונית לא נמצאה" });
      }
      res.status(200).json(updatedInvoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "שגיאה בעדכון החשבונית" });
    }
  },

  // ✅ מחיקת חשבונית בפרויקט
  deleteInvoice: async (req, res) => {
    const { projectId, id } = req.params;
    try {
      const deletedInvoice = await invoiceService.deleteInvoiceById(projectId, id);
      if (!deletedInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.status(200).json({ message: 'החשבונית נמחקה בהצלחה' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return res.status(500).json({ message: error.message || 'שגיאה במחיקת החשבונית' });
    }
  },

  // ✅ העברת חשבונית בין פרויקטים (from = params.projectId, to = body)
  moveInvoice: async (req, res) => {
    try {
      const { projectId, id } = req.params; // fromProjectId, invoiceId
      const { toProjectId, toProjectName } = req.body;

      const target = toProjectId || toProjectName;
      if (!target) {
        return res.status(400).json({ message: 'Missing toProjectId or toProjectName' });
      }

      let toPid = toProjectId;
      if (!toPid && toProjectName) {
        const found = await invoiceService.resolveProjectIdByName(toProjectName);
        toPid = found?._id?.toString();
      }
      if (!toPid) return res.status(404).json({ message: 'Target project not found' });

      // ההרשאה לכתוב במקור נבדקה בראוטר; כאן ניתן להוסיף בדיקת write ליעד אם תרצה.

      const result = await invoiceService.moveInvoiceToProject(id, toPid, projectId);
      if (!result?.invoice) {
        return res.status(404).json({ message: 'Invoice not found or not moved' });
      }

      return res.json({
        message: 'Invoice moved successfully',
        invoice: result.invoice,
        toProject: toPid,
      });
    } catch (err) {
      console.error('[moveInvoice] error:', err);
      return res.status(500).json({ message: err.message || 'Internal error' });
    }
  },

  // ✅ חשבוניות של ספק בתוך פרויקט
  getSupplierInvoices: async (req, res) => {
    const { projectId, id } = req.params; // id = supplierId
    const { page = 1, limit = 50, populate } = req.query;

    const { data, total, pages } = await invoiceService.listInvoicesBySupplier(
      projectId,
      id,
      { page, limit, withPopulate: String(populate) === "true" }
    );

    res.json({
      data,
      meta: { total, page: Number(page), limit: Number(limit), pages },
    });
  },
};

export default invoiceControllers;
