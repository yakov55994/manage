// ===============================================
// INVOICE CONTROLLER – MULTI-PROJECT SYSTEM
// ===============================================

import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import Counter from "../models/Counter.js";
import invoiceService, {
  recalculateRemainingBudget
} from "../services/invoiceService.js";
import { sendPaymentConfirmationEmail } from "../services/emailService.js";
import { generateInvoiceExportPDF } from "../services/invoicePdfService.js";
import fs from "fs";

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
  // ===============================================
  // הוספת קבצים לחשבונית
  // ===============================================
  async addFilesToInvoice(req, res) {
    try {
      const { files } = req.body;
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ success: false, error: "חשבונית לא נמצאה" });
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: "יש לספק קבצים" });
      }

      // בדיקת כפילויות מספרים סידוריים
      const docNumbers = files.map(f => f.documentNumber).filter(Boolean);
      if (docNumbers.length > 0) {
        const duplicates = await checkDuplicateDocNumbers(docNumbers);
        if (duplicates.length > 0) {
          return res.status(400).json({
            success: false,
            error: `מספרים סידוריים כפולים: ${duplicates.join(", ")}`
          });
        }
      }

      invoice.files.push(...files);

      // 📝 תיעוד העלאת קבצים בהיסטוריה
      if (!invoice.editHistory) invoice.editHistory = [];
      const fileChanges = `הועלו ${files.length} קבצים`;
      invoice.editHistory.push({
        userId: req.user._id,
        userName: req.user.username || req.user.name,
        action: 'files_added',
        changes: fileChanges,
        timestamp: new Date()
      });

      await invoice.save();

      const populated = await Invoice.findById(invoice._id)
        .populate("supplierId", "name email phone")
        .populate("projects.projectId", "name");

      res.json({ success: true, data: populated });
    } catch (err) {
      console.error("❌ ADD FILES ERROR:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async bulkUpdateSubmissionStatus(req, res) {
    try {
      const { invoiceIds, status } = req.body;

      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({ success: false, error: "חייב לספק מערך של מזהי חשבוניות" });
      }

      if (!["הוגש", "לא הוגש", "בעיבוד"].includes(status)) {
        return res.status(400).json({ success: false, error: "סטטוס הגשה לא תקין" });
      }

      const historyEntry = {
        userId: req.user._id,
        userName: req.user.username || req.user.name,
        action: "submission_status_changed",
        changes: `סטטוס הגשה שונה ל: ${status} (עדכון מרובה)`,
        timestamp: new Date(),
      };

      const updated = await Invoice.updateMany(
        { _id: { $in: invoiceIds } },
        { $set: { status }, $push: { editHistory: historyEntry } }
      );

      res.json({ success: true, updated: updated.modifiedCount, message: `עודכנו ${updated.modifiedCount} חשבוניות` });
    } catch (err) {
      console.error("❌ BULK SUBMISSION UPDATE ERROR:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async bulkUpdatePaymentStatus(req, res) {
    try {
      const { invoiceIds, status, paymentDate, paymentMethod, checkNumber, checkDate } = req.body;

      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "חייב לספק מערך של מזהי חשבוניות"
        });
      }

      if (!["כן", "לא", "יצא לתשלום", "לא לתשלום"].includes(status)) {
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

      // 📝 תיעוד שינוי מרובה בהיסטוריה
      const bulkStatusText = status === "כן" ? "שולם" : status === "יצא לתשלום" ? "יצא לתשלום" : status === "לא לתשלום" ? "לא לתשלום" : "לא שולם";
      const bulkHistoryEntry = {
        userId: req.user._id,
        userName: req.user.username || req.user.name,
        action: 'payment_status_changed',
        changes: `סטטוס תשלום שונה ל: ${bulkStatusText} (עדכון מרובה)`,
        timestamp: new Date()
      };

      const updated = await Invoice.updateMany(
        { _id: { $in: invoiceIds } },
        {
          $set: updateObj,
          $push: { editHistory: bulkHistoryEntry }
        }
      );

      // שליחת מיילים לספקים כשמעדכנים לשולם
      if (status === "כן") {
        try {
          const invoicesWithSuppliers = await Invoice.find({ _id: { $in: invoiceIds } })
            .populate("supplierId", "name email");

          for (const invoice of invoicesWithSuppliers) {
            if (invoice.supplierId?.email) {
              try {
                await sendPaymentConfirmationEmail(
                  invoice.supplierId.email,
                  invoice.supplierId.name,
                  {
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    paymentDate: paymentDate || new Date(),
                    documentType: invoice.documentType,
                    detail: invoice.detail,
                    paymentMethod: invoice.paymentMethod || paymentMethod,
                  }
                );
              } catch (emailError) {
                console.error(`❌ Failed to send email for invoice ${invoice.invoiceNumber}:`, emailError);
              }
            }
          }
        } catch (emailBatchError) {
          console.error("❌ Failed to send payment emails:", emailBatchError);
        }
      }

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

  // ===============================================
  // מספר סידורי הבא לחשבוניות "אין צורך"
  // ===============================================
  async getNextNoDocSerial(req, res) {
    try {
      const nextSerial = await getNextAinTsorchSerial();
      res.json({ success: true, serial: nextSerial });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // תצוגה מקדימה – מספר סידורי הבא (לא שורף מספר!)
  // ===============================================
  async previewNextDocSerial(req, res) {
    try {
      await ensureDocSerialCounter();
      const counter = await Counter.findOne({ name: "documentSerial" });
      const next = (counter?.seq || 0) + 1;
      res.json({ success: true, serial: String(next).padStart(4, "0") });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // מספר סידורי הבא למסמכים (קבצים) – אטומי וייחודי
  // ===============================================
  async getNextDocSerial(req, res) {
    try {
      const count = parseInt(req.query.count) || 1;
      await ensureDocSerialCounter();

      if (count === 1) {
        const seq = await Counter.getNextSequence("documentSerial");
        res.json({ success: true, serial: String(seq).padStart(4, "0") });
      } else {
        // לקבצים מרובים - מחזיר מערך של מספרים רצופים
        const serials = await Counter.getNextSequenceBatch("documentSerial", count);
        res.json({
          success: true,
          serial: String(serials[0]).padStart(4, "0"),
          serials: serials.map(s => String(s).padStart(4, "0"))
        });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // מילוי מספרים סידוריים לקבצים מסוג "אין צורך" שאין להם מספר מסמך
  // ===============================================
  async backfillDocSerials(req, res) {
    try {
      // רק חשבוניות שיש להן קבצים מסוג "אין צורך"
      const invoices = await Invoice.find({
        "files.0": { $exists: true },
        "files.documentType": "אין צורך"
      }).sort({ createdAt: 1 });

      // ספור כמה קבצים מסוג "אין צורך" חסרי מספר יש
      let filesWithoutSerial = 0;
      for (const inv of invoices) {
        for (const file of inv.files) {
          if (file.documentType === "אין צורך" && !file.documentNumber) {
            filesWithoutSerial++;
          }
        }
      }

      if (filesWithoutSerial === 0) {
        return res.json({ success: true, message: "כל הקבצים מסוג 'אין צורך' כבר מספוררו", updated: 0 });
      }

      // הקצה מספרים אטומית דרך Counter
      await ensureDocSerialCounter();
      const serials = await Counter.getNextSequenceBatch("documentSerial", filesWithoutSerial);
      let serialIndex = 0;
      let updatedCount = 0;

      for (const inv of invoices) {
        let changed = false;
        for (const file of inv.files) {
          if (file.documentType === "אין צורך" && !file.documentNumber) {
            file.documentNumber = String(serials[serialIndex]).padStart(4, "0");
            serialIndex++;
            changed = true;
            updatedCount++;
          }
        }
        if (changed) {
          await inv.save();
        }
      }

      res.json({
        success: true,
        message: `עודכנו ${updatedCount} קבצים מסוג "אין צורך"`,
        updated: updatedCount,
        lastSerial: serials[serials.length - 1]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // מילוי מספרים סידוריים לכל חשבוניות "אין צורך" – מספור מ-0 ללא כפילויות
  // ===============================================
  async backfillNoDocSerials(req, res) {
    try {
      // שלוף את כל חשבוניות "אין צורך" לפי סדר יצירה
      const allInvoices = await Invoice.find({
        documentType: "אין צורך",
      }).sort({ createdAt: 1 });

      if (allInvoices.length === 0) {
        return res.json({ success: true, message: "אין חשבוניות מסוג 'אין צורך'", updated: 0 });
      }

      // מספור מחדש מ-0 לכולם – ללא כפילויות
      let updated = 0;
      for (let i = 0; i < allInvoices.length; i++) {
        const newNumber = String(i);
        if (allInvoices[i].invoiceNumber !== newNumber) {
          allInvoices[i].invoiceNumber = newNumber;
          await allInvoices[i].save();
          updated++;
        }
      }

      res.json({
        success: true,
        message: `עודכנו ${updated} חשבוניות (סה"כ ${allInvoices.length} חשבוניות "אין צורך")`,
        updated,
        total: allInvoices.length,
        lastSerial: allInvoices.length - 1
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ===============================================
  // ייצוא סיכום חשבוניות ל-PDF
  // ===============================================
  async exportInvoices(req, res) {
    try {
      const projectId = req.body.projectId || req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "projectId is required",
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      // מציאת חשבוניות השייכות לפרויקט
      const invoices = await Invoice.find({
        "projects.projectId": projectId,
      })
        .populate("supplierId", "name")
        .sort({ createdAt: -1 });

      if (invoices.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No invoices found for this project",
        });
      }

      // הכנת נתונים לתבנית
      const invoiceData = invoices.map((inv) => {
        const proj = inv.projects.find(
          (p) => String(p.projectId) === String(projectId)
        );
        return {
          invoiceNumber: inv.invoiceNumber,
          supplierName: inv.supplierId?.name || inv.invitingName || "-",
          documentType: inv.documentType || "-",
          amount: proj ? proj.sum : inv.totalAmount,
          paid: inv.paid === "כן" ? "שולם" : inv.paid === "יצא לתשלום" ? "יצא לתשלום" : "לא שולם",
          date: inv.invoiceDate || inv.createdAt,
          detail: inv.detail || "",
        };
      });

      const pdfPath = await generateInvoiceExportPDF({
        invoices: invoiceData,
        projectName: project.name,
      });

      const fileName = `invoice-export-${project.name}.pdf`;

      res.download(pdfPath, fileName, (err) => {
        if (err) console.error("PDF DOWNLOAD ERROR:", err);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      });
    } catch (err) {
      console.error("EXPORT INVOICES ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
}

// פונקציית עזר - מחזירה את המספר הסידורי הבא (מבוסס ספירה + בדיקת כפילויות)
async function getNextAinTsorchSerial() {
  const count = await Invoice.countDocuments({ documentType: "אין צורך" });
  let next = count;

  // בדיקת כפילויות – אם המספר כבר קיים, המשך עד שתמצא פנוי
  while (await Invoice.exists({ documentType: "אין צורך", invoiceNumber: String(next) })) {
    next++;
  }

  return String(next);
}

// ===============================================
// פונקציות עזר – מספרים סידוריים אטומיים למסמכים
// ===============================================

// סורקת את כל הקבצים הקיימים ומחזירה את המקסימום
async function getMaxDocumentSerial() {
  const invoices = await Invoice.find({ "files.documentNumber": { $exists: true, $ne: "" } }).select("files.documentNumber");

  let max = 0;
  for (const inv of invoices) {
    for (const file of inv.files) {
      if (file.documentNumber) {
        const num = parseInt(file.documentNumber, 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
  }
  return max;
}

// מוודאת שה-Counter מאותחל עם המקסימום הנוכחי (רץ פעם אחת)
async function ensureDocSerialCounter() {
  const counter = await Counter.findOne({ name: "documentSerial" });
  if (!counter) {
    // אתחול ראשוני – סנכרון עם המספר הגבוה ביותר הקיים
    const max = await getMaxDocumentSerial();
    await Counter.findOneAndUpdate(
      { name: "documentSerial" },
      { $setOnInsert: { seq: max } },
      { upsert: true }
    );
  }
}

// בדיקת כפילויות מספרים סידוריים
async function checkDuplicateDocNumbers(docNumbers) {
  const invoices = await Invoice.find({
    "files.documentNumber": { $in: docNumbers }
  }).select("files.documentNumber");

  const existingNumbers = new Set();
  for (const inv of invoices) {
    for (const file of inv.files) {
      if (file.documentNumber && docNumbers.includes(file.documentNumber)) {
        existingNumbers.add(file.documentNumber);
      }
    }
  }
  return Array.from(existingNumbers);
}

export default invoiceControllers;