import fs from "fs";
import Project from "../models/Project.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";
import Salary from "../models/Salary.js";
import Supplier from "../models/Supplier.js";
import { generateProjectKarteset, generateSupplierKarteset } from "../services/kartesetPdfService.js";

export default {
  // כרטסת פרויקט
  async projectKarteset(req, res) {
    let pdfPath = null;
    try {
      const { projectId, dateFrom, dateTo } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "חסר מזהה פרויקט" });
      }

      const project = await Project.findById(projectId).lean();
      if (!project) {
        return res.status(404).json({ error: "פרויקט לא נמצא" });
      }

      // טעינת הזמנות
      let orderQuery = { projectId };
      if (dateFrom || dateTo) {
        orderQuery.createdAt = {};
        if (dateFrom) orderQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) orderQuery.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
      }
      const orders = await Order.find(orderQuery).populate("supplierId", "name").lean();

      // טעינת חשבוניות
      let invoiceQuery = { "projects.projectId": projectId };
      if (dateFrom || dateTo) {
        const dateField = {};
        if (dateFrom) dateField.$gte = new Date(dateFrom);
        if (dateTo) dateField.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
        invoiceQuery.$or = [
          { invoiceDate: dateField },
          { invoiceDate: { $exists: false }, createdAt: dateField },
        ];
      }
      const invoices = await Invoice.find(invoiceQuery).populate("supplierId", "name").lean();

      // טעינת משכורות
      let salaryQuery = { projectId };
      if (dateFrom || dateTo) {
        salaryQuery.date = {};
        if (dateFrom) salaryQuery.date.$gte = new Date(dateFrom);
        if (dateTo) salaryQuery.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
      }
      const salaries = await Salary.find(salaryQuery).lean();

      pdfPath = await generateProjectKarteset({
        project,
        orders,
        invoices,
        salaries,
        dateFrom,
        dateTo,
      });

      res.download(pdfPath, `כרטסת-${project.name}.pdf`, (err) => {
        if (err && !res.headersSent) {
          console.error("Error sending karteset PDF:", err);
          res.status(500).json({ error: "שגיאה בהורדת הכרטסת" });
        }
        // מחיקת קובץ זמני
        if (pdfPath && fs.existsSync(pdfPath)) {
          fs.unlink(pdfPath, () => {});
        }
      });
    } catch (err) {
      console.error("Error generating project karteset:", err);
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlink(pdfPath, () => {});
      }
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  },

  // כרטסת ספק
  async supplierKarteset(req, res) {
    let pdfPath = null;
    try {
      const { supplierId, dateFrom, dateTo } = req.body;

      if (!supplierId) {
        return res.status(400).json({ error: "חסר מזהה ספק" });
      }

      const supplier = await Supplier.findById(supplierId).lean();
      if (!supplier) {
        return res.status(404).json({ error: "ספק לא נמצא" });
      }

      // טעינת חשבוניות של הספק
      let invoiceQuery = { supplierId };
      if (dateFrom || dateTo) {
        const dateField = {};
        if (dateFrom) dateField.$gte = new Date(dateFrom);
        if (dateTo) dateField.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
        invoiceQuery.$or = [
          { invoiceDate: dateField },
          { invoiceDate: { $exists: false }, createdAt: dateField },
        ];
      }
      const invoices = await Invoice.find(invoiceQuery).lean();

      // טעינת פרויקטים עם הפחתות תקציב
      const projectIds = [...new Set(
        invoices.flatMap(inv =>
          (inv.projects || []).map(p => String(p.projectId))
        ).filter(Boolean)
      )];
      const projects = projectIds.length > 0
        ? await Project.find({ _id: { $in: projectIds } }).lean()
        : [];

      pdfPath = await generateSupplierKarteset({
        supplier,
        invoices,
        projects,
        dateFrom,
        dateTo,
      });

      res.download(pdfPath, `כרטסת-ספק-${supplier.name}.pdf`, (err) => {
        if (err && !res.headersSent) {
          console.error("Error sending karteset PDF:", err);
          res.status(500).json({ error: "שגיאה בהורדת הכרטסת" });
        }
        if (pdfPath && fs.existsSync(pdfPath)) {
          fs.unlink(pdfPath, () => {});
        }
      });
    } catch (err) {
      console.error("Error generating supplier karteset:", err);
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlink(pdfPath, () => {});
      }
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  },
};
