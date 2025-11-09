import invoiceService from '../services/invoiceService.js';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary'
import Invoice from '../models/Invoice.js';
import Supplier from '../models/Supplier.js'


const ALLOWED_DOC_TYPES = [
  "ח. עסקה",
  "ה. עבודה",
  "ד. תשלום, חשבונית מס / קבלה",
];

const invoiceControllers = {

  
  check_duplicate: async (req, res) => {
  const { supplierName, invoiceNumber } = req.query;

  if (!supplierName || !invoiceNumber) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const exists = await Invoice.findOne({
      invoiceNumber,
      invitingName: supplierName,
    });

    res.json({ exists: !!exists });
  } catch (error) {
    console.error('Error checking duplicate invoice:', error);
    res.status(500).json({ message: "Server error" });
  }
},

createInvoices: async (req, res) => {
  try {
    let { invoices } = req.body;

    if (!invoices || (Array.isArray(invoices) && invoices.length === 0)) {
      return res.status(400).json({ message: "Invalid invoices data" });
    }
    if (!Array.isArray(invoices)) invoices = [invoices];

    const processedInvoices = invoices.map((invoice) => {
      // מספר חשבונית חובה
      if (!invoice.invoiceNumber) {
        console.error("Missing invoiceNumber:", invoice);
        return null;
      }

      // סוג מסמך חובה + תקינות ערך
      const documentType = (invoice.documentType || "").trim();
      if (!documentType) {
        console.error("Missing documentType:", invoice);
        return null;
      }
      if (!ALLOWED_DOC_TYPES.includes(documentType)) {
        console.error("Invalid documentType:", documentType);
        return null;
      }

      // קבצים (נורמליזציה)
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

      console.log(
        `Processing invoice ${invoice.invoiceNumber} with ${files.length} files.`
      );

      // החזרת האובייקט המעובד כולל documentType
      return {
        ...invoice,
        documentType, // ✅ שמירה
        files,
      };
    }).filter((invoice) => invoice !== null);

    if (processedInvoices.length === 0) {
      return res.status(400).json({ message: "No valid invoices to process" });
    }

    const newInvoices = await invoiceService.createInvoices(processedInvoices);

    // עדכון רפרנס אצל ספקים (כמו שהיה)
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

  search: async (req, res) => {
    try {
      const { query } = req.query; // מקבלים את מילת החיפוש מתוך ה-URL
      const results = await invoiceService.search(query); // שולחים את מילת החיפוש לשירות
      res.status(200).json(results); // מחזירים את התוצאות
    } catch (error) {
      console.error('שגיאה במהלך החיפוש: ', error); // הדפסת שגיאה
      res.status(500).json({ message: 'שגיאה במהלך החיפוש', error: error.message });
    }
  },

  fetchInvoices: async (req, res) => {
    try {
      const invoices = await invoiceService.getInvoicesByProject(projectName);

      if (!invoices.length) {
        return res.status(404).json({ message: "לא נמצאו חשבוניות לפרויקט זה" });
      }

      return res.status(200).json({ data: invoices });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "שגיאה בשליפת החשבוניות", error: error.message });
    }
  },
  getAllInvoices: async (req, res) => {
    try {
      const invoices = await invoiceService.getAllInvoices();
      return res.status(200).json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת חשבוניות', error: error.message });
    }
  },

  getInvoiceById: async (req, res) => {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ה-ID לא תקין" });
    }

    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: 'החשבונית לא נמצאה' });
      }
      return res.status(200).json(invoice);
    } catch (error) {
      console.error('Error fetching invoice by ID:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת חשבונית', error: error.message });
    }
  },

debugCloudinaryFile: async (fileUrl, publicId) => {
  try {
    console.log("🔍 DEBUG: Checking file existence in Cloudinary...");
    
    // בדיקה באמצעות search API
    const searchResult = await cloudinary.search
      .expression(`public_id:${publicId}`)
      .execute();
    
    console.log("🔍 Search result:", searchResult);
    
    if (searchResult.resources && searchResult.resources.length > 0) {
      const resource = searchResult.resources[0];
      console.log("🔍 Found resource:", {
        public_id: resource.public_id,
        resource_type: resource.resource_type,
        type: resource.type,
        format: resource.format
      });
      
      return {
        found: true,
        resource_type: resource.resource_type,
        type: resource.type,
        format: resource.format,
        actual_public_id: resource.public_id
      };
    } else {
      console.log("🔍 No resources found in search");
      return { found: false };
    }
  } catch (error) {
    console.error("🔍 Search error:", error);
    return { found: false, error: error.message };
  }
},
// פונקציה למחיקת קובץ מקלאודינרי
deleteFromCloudinary: async (fileUrl) => {
  try {
    console.log("🗑️ Original URL:", fileUrl);
    
    // חילוץ מספר options לבדיקה
    const options = [
      // אופציה 1: הנתיב המלא מה-URL
      fileUrl.split('/upload/')[1]?.replace(/^v\d+\//, '').replace(/\.[^.]+$/, ''),
      // אופציה 2: רק השם עם התיקיה
      `invoices/${fileUrl.split('/').pop().replace(/\.[^.]+$/, '')}`,
      // אופציה 3: רק השם בלי תיקיה
      fileUrl.split('/').pop().replace(/\.[^.]+$/, ''),
      // אופציה 4: עם קו תחתון
      `invoices_${fileUrl.split('/').pop().replace(/\.[^.]+$/, '')}`
    ];
    
    console.log("🗑️ Trying public_id options:", options);
    
    for (const publicId of options) {
      if (!publicId) continue;
      
      console.log(`🗑️ Attempting to delete: ${publicId}`);
      
      // נסה עם resource types שונים
      const resourceTypes = ['image', 'raw', 'video'];
      
      for (const resourceType of resourceTypes) {
        try {
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
          });
          
          console.log(`🗑️ Result for ${publicId} as ${resourceType}:`, result);
          
          if (result.result === 'ok') {
            console.log(`✅ Successfully deleted ${publicId} as ${resourceType}`);
            return result;
          }
        } catch (typeError) {
          console.log(`❌ Error with ${resourceType}:`, typeError.message);
        }
      }
      
      // נסה גם בלי resource_type
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`🗑️ Result for ${publicId} without resource_type:`, result);
        
        if (result.result === 'ok') {
          console.log(`✅ Successfully deleted ${publicId} without resource_type`);
          return result;
        }
      } catch (autoError) {
        console.log(`❌ Auto detection failed:`, autoError.message);
      }
    }
    
    console.log("❌ File not found with any combination");
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

    if (match && match[1]) {
      return match[1];
    }
    return null;
  },

  deleteFile: async (req, res) => {
  try {
    // קבל את publicId ו-resourceType ישירות מהבקשה
    const { publicId, resourceType } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'חסר publicId למחיקה.' });
    }

    // השתמש ב-resourceType שקיבלת, או ברירת מחדל ל-'auto' אם לא קיים
    const typeToDelete = resourceType || 'auto';

    console.log(`מנסה למחוק נכס מקלאודנירי עם publicId: ${publicId} ו-resource_type: ${typeToDelete}`);

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: typeToDelete });

    console.log(`תוצאת מחיקת קלאודנירי עבור ${publicId} (type: ${typeToDelete}):`, result);

    if (result.result === 'ok') {
res.json({
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
updateInvoice : async (req, res) => {
  const { id } = req.params;

  const updated = await invoiceService.updateInvoiceService (id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "חשבונית לא נמצאה" });
  }

  res.json({ message: "החשבונית עודכנה בהצלחה", invoice: updated });
},


  updateInvoicePaymentStatus: async (req, res) => {
  const { id } = req.params;
  const { paid, paymentDate, paymentMethod } = req.body; 
  try {
    const updatedInvoice = await invoiceService.updatePaymentStatusService(
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

  updateInvoicePaymentDate: async (req, res) => {
    const { id } = req.params;
    const { paid, paymentDate } = req.body; // 'paid' יהיה 'כן' או 'לא'
  
    try {
      // קריאה לשירות לעדכון הסטטוס
      const updatedInvoice = await invoiceService.updatePaymentDate(id, paid, paymentDate);
  
      if (!updatedInvoice) {
        return res.status(404).json({ message: "חשבונית לא נמצאה" });
      }
  
      res.status(200).json(updatedInvoice);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "שגיאה בעדכון החשבונית" });
    }
  },

  deleteInvoice: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedInvoice = await invoiceService.deleteInvoiceById(id);
      if (!deletedInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // שליחת תשובה ללקוח
      res.status(200).json({ message: 'החשבונית נמחקה בהצלחה' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return res.status(500).json({ message: error.message || 'שגיאה במחיקת החשבונית' });
    }
  },

  moveInvoice : async (req, res) => {
  try {
    const { id } = req.params; // invoiceId
    const { toProjectId, toProjectName } = req.body;

    const target = toProjectId || toProjectName;
    if (!target) {
      return res.status(400).json({ message: 'Missing toProjectId or toProjectName' });
    }

    const result = await invoiceService.moveInvoiceToProject(id, target);
    if (!result?.invoice) {
      return res.status(404).json({ message: 'Invoice not found or not moved' });
    }

    return res.json({
      message: 'Invoice moved successfully',
      invoice: result.invoice,
      toProject: result.toProject?._id,
    });
  } catch (err) {
    console.error('[moveInvoice] error:', err);
    return res.status(500).json({ message: err.message || 'Internal error' });
  }
},

getSupplierInvoices : async  (req, res) => {
  const { id } = req.params;                 // supplier id
  const { page = 1, limit = 50, populate } = req.query;

  const { data, total, pages } = await invoiceService.listInvoicesBySupplier(id, {
    page,
    limit,
    withPopulate: String(populate) === "true", // /suppliers/:id/invoices?populate=true
  });

  res.json({
    data,
    meta: { total, page: Number(page), limit: Number(limit), pages },
  });
},
}

export default invoiceControllers;
