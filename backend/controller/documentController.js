import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";

export const collectDocuments = async (req, res) => {
  try {
    const { projectId, supplierId, fromDate, toDate } = req.body;

    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (supplierId) filter.supplierId = supplierId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    // חשבוניות תואמות
    const invoices = await Invoice.find(filter)
      .populate("projectId")
      .populate("supplierId");

    // הזמנות תואמות
    const orders = await Order.find(filter)
      .populate("projectId")
      .populate("supplierId");

    // שים לב: File **לא יכול להיות מסונן לפי projectId/supplierId** כי אין שדה כזה!
    const files = []; // עד שתוסיף שדות מתאימים למודל File

    const documents = [
      ...invoices.map((i) => ({
        type: "חשבונית",
        number: i.invoiceNumber,
        project: i.projectName,
        supplier: i.supplierId || "-",
        date: i.createdAt,
        total: i.sum,
      })),
      ...orders.map((o) => ({
        type: "הזמנה",
        number: o.orderNumber,
        project: o.projectName,
        supplier: o.supplierId || "-",
        date: o.createdAt,
        total: o.sum,
      }))
    ];

    res.json({ success: true, documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "שגיאה בהפקת המסמכים" });
  }
};
