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

    // חיפוש מקיף בכל השדות הרלוונטיים
    const suppliers = await Supplier.find({
      $or: [
        { name: regex },
        { address: regex },
        { email: regex },
        { phone: regex },
        { supplierType: regex },
        { "bankDetails.bankName": regex },
        { "bankDetails.branchNumber": regex },
        { "bankDetails.accountNumber": regex },
      ],
    }).limit(100);

    // אם לא נמצאו תוצאות, חפש גם במספר עוסק
    if (suppliers.length === 0) {
      const allSuppliers = await Supplier.find({}).limit(100);

      return allSuppliers.filter(supplier => {
        const businessTax = supplier.business_tax?.toString() || "";
        return businessTax.includes(query);
      });
    }

    return suppliers;
  },

  async getAllSuppliers(type = null) {
    const query = {};

    if (type && type !== "all" && type !== "both") {
      query.$or = [
        { supplierType: type },   // למשל "orders"
        { supplierType: "both" }, // ספקים שמשרתים את שני הסוגים
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
    { 
      path: "projects.projectId", 
      select: "name" 
    },
    { 
      path: "files", 
      select: "url publicId resourceType" 
    }
  ],
})


  if (!supplier) return null;

  // אדמין → גישה מלאה
  if (user.role === "admin") return supplier;

  // ספק שלא משויך לפרויקטים
  if (!supplier.projects || supplier.projects.length === 0)
    return supplier;

  // הרשאות נכונות
  const supplierProjectIds = supplier.projects.map(p =>
    String(p.projectId || p)
  );

  const hasAccess = user.permissions.some(u =>
    supplierProjectIds.includes(String(u.project))
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
