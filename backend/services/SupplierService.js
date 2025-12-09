// services/supplierService.js
import Supplier from "../models/Supplier.js";

function canView(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(p => String(p.project) === String(projectId));
}

function canEdit(user, projectId) {
  if (user.role === "admin") return true;
  return user.permissions.some(p =>
    String(p.project) === String(projectId) &&
    p.modules?.suppliers === "edit"
  );
}

export default {

  async searchSuppliers(query) {
    const regex = new RegExp(query, "i");

    return Supplier.find({
      $or: [
        { name: regex },
        { address: regex },
        { email: regex },
        { phone: regex },
        { "bankDetails.bankName": regex },
      ],
    }).limit(50);
  },

async getAllSuppliers(type = null) {
    const query = {};

    // 🆕 אם נשלח type - סנן לפי supplierType
    if (type && type !== "all") {
      query.$or = [
        { supplierType: type },
        { supplierType: "both" },
        { supplierType: null },              // 🆕 ספקים ישנים
        { supplierType: { $exists: false } } // 🆕 ספקים ללא השדה בכלל
      ];
    }

    return Supplier.find(query);
  },

  async getSuppliersByProject(user, projectId) {
    if (!canView(user, projectId)) throw new Error("אין גישה");

    return Supplier.find({ projects: projectId })
      .populate({
        path: "invoices",
        model: "Invoice",
        match: { projectId },
        populate: { path: "projectId", select: "name" }
      });
  },

  // async getSupplierById(user, supplierId) {
  //   const supplier = await Supplier.findById(supplierId)
  //     .populate({
  //       path: "invoices",
  //       model: "Invoice",
  //       populate: [
  //         { path: "projectId", select: "name" },
  //         { path: "files", select: "url publicId resourceType" }
  //       ],
  //     });

  //   if (!supplier) return null;

  //   if (user.role === "admin") return supplier;

  //   if (supplier.projects.length === 0) return supplier;

  //   const hasAccess = supplier.projects.some(p =>
  //     user.permissions.some(u => String(u.project) === String(p))
  //   );

  //   if (!hasAccess) throw new Error("אין גישה לספק");

  //   return supplier;
  // },

  // async getSupplierById(user, supplierId) {
  //   const supplier = await Supplier.findById(supplierId)
  //     .populate({
  //       path: "invoices",
  //       model: "Invoice",
  //       populate: [
  //         { path: "projectId", select: "name" },
  //         { path: "files", select: "url publicId resourceType" }
  //       ],
  //     });

  //   if (!supplier) return null;

  //   // אם אדמין — גישה מלאה
  //   if (user.role === "admin") return supplier;

  //   // ספק ללא פרויקטים — פתוח לכל משתמש שיש לו מודול ספקים
  //   if (supplier.projects.length === 0) return supplier;

  //   const hasAccess = supplier.projects.some(p =>
  //     user.permissions.some(u => String(u.project) === String(p))
  //   );

  //   if (!hasAccess) throw new Error("אין גישה לספק");

  //   return supplier;
  // },

  async getSuppliersByProject(user, projectId) {
    if (!canView(user, projectId)) throw new Error("אין גישה");

    return Supplier.find({ projects: projectId })
      .populate({
        path: "invoices",
        model: "Invoice",
        match: { projectId },
        populate: { path: "projectId", select: "name" }
      });
  },

  async getSupplierById(user, supplierId) {
    const supplier = await Supplier.findById(supplierId)
      .populate({
        path: "invoices",
        model: "Invoice",
        populate: [
          { path: "projectId", select: "name" },
          { path: "files", select: "url publicId resourceType" }
        ],
      });

    if (!supplier) return null;

    if (user.role === "admin") return supplier;

    if (supplier.projects.length === 0) return supplier;

    const hasAccess = supplier.projects.some(p =>
      user.permissions.some(u => String(u.project) === String(p))
    );

    if (!hasAccess) throw new Error("אין גישה לספק");

    return supplier;
  },

  async createSupplier(user, data) {
    if (!canEdit(user, data.projectId))
      throw new Error("אין הרשאה ליצור ספק");

    // ✅ supplierType יישמר אוטומטית אם הוא נשלח ב-data
    const supplierData = {
      ...data,
      createdBy: user._id,
      createdByName: user.username || user.name || 'משתמש'
    };

    const supplier = await Supplier.create(supplierData);

    return supplier;
  },

  async updateSupplier(user, supplierId, data) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) throw new Error("לא נמצא");

    const projectId = supplier.projects?.[0];

    if (!canEdit(user, projectId))
      throw new Error("אין הרשאה");

    Object.assign(supplier, data);
    return supplier.save();
  },

  async deleteSupplier(user, supplierId) {
    const supplier = await Supplier.findById(supplierId);

    if (!supplier) throw new Error("לא נמצא");

    const projectId = supplier.projects?.[0];

    if (!canEdit(user, projectId))
      throw new Error("אין הרשאה למחוק");

    await supplier.deleteOne();
    return true;
  },

  async getSuppliersByProject(user, projectId) {
    if (!canView(user, projectId)) throw new Error("אין גישה");

    return Supplier.find({ projects: projectId })
      .populate({
        path: "invoices",
        model: "Invoice",
        match: { projectId }, // רק חשבוניות של הפרויקט הזה
        populate: { path: "projectId", select: "name" }
      });
  },

};
