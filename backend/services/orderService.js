// services/orderService.js
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Project from '../models/Project.js';



function normalizeFiles(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(file => ({
    name: file?.name || file?.fileName || 'unknown',
    url:  file?.url  || file?.fileUrl  || '',
    type: file?.type || file?.fileType || 'application/octet-stream',
    size: file?.size || 0,
  }));
}

const orderService = {
  /**
   * ➕ יצירת הזמנות עבור projectId
   * מגדיל budget ו־remainingBudget של הפרויקט לפי סכומי ההזמנות
   */
  async create(projectId, ordersData) {
    (projectId);
    if (!ordersData || (Array.isArray(ordersData) && ordersData.length === 0)) {
      throw new Error('Invalid orders data');
    }
    const payload = Array.isArray(ordersData) ? ordersData : [ordersData];

    // ולידציה בסיסית + כפילות לפי orderNumber
    for (const o of payload) {
      const required = ['orderNumber','invitingName','detail','sum','status','Contact_person','createdAt'];
      const missing = required.filter(k => !o?.[k]);
      if (missing.length) {
        throw new Error(`יש למלא את כל השדות להזמנה: חסר ${missing.join(', ')}`);
      }
      const dup = await Order.findOne({ orderNumber: o.orderNumber, projectId });
      if (dup) {
        throw new Error(`הזמנה עם מספר ${o.orderNumber} כבר קיימת בפרויקט`);
      }
    }

    // Normalize + קיבוע projectId
    const docs = payload.map(o => ({
      ...o,
      projectId,
      files: normalizeFiles(o.files),
    }));

    // טרנזקציה: יצירה + עדכון פרויקט
    const session = await mongoose.startSession();
    try {
      let created = [];
      await session.withTransaction(async () => {
        created = await Order.insertMany(docs, { session });

        const totalSum = created.reduce((s, x) => s + Number(x.sum || 0), 0);

        await Project.findByIdAndUpdate(
          projectId,
          {
            $push: { orders: { $each: created.map(x => x._id) } },
            $inc: { budget: totalSum, remainingBudget: totalSum },
          },
          { new: true, session }
        );
      });
      return created;
    } finally {
      session.endSession();
    }
  },

  /**
   * 📃 רשימת הזמנות בפרויקט (עם עמודים וחיפוש חופשי q)
   */
  async listByProject(projectId, { page = 1, limit = 50, q } = {}) {
    (projectId);
    const filter = { projectId };

    if (q != null && q !== '') {
      const or = [
        { projectName: { $regex: q, $options: 'i' } },
        { invitingName: { $regex: q, $options: 'i' } },
        { detail: { $regex: q, $options: 'i' } },
      ];
      if (!isNaN(q)) {
        or.push({ orderNumber: parseInt(q, 10) });
        or.push({ sum: parseFloat(q) });
      }
      Object.assign(filter, { $or: or });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit || 1)) || 1,
    };
  },

  /**
   * 📄 הזמנה בודדת בפרויקט
   */

async getById(projectId, id) {
  const query = { _id: id };
  // אם בכל זאת יגיע projectId – נוסיף לפילטר
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    query.projectId = new mongoose.Types.ObjectId(projectId);
  }
  return Order.findOne(query); // או Order.findById(id) אם לא צריך projectId בכלל
},

  /**
   * ✏️ עדכון הזמנה בפרויקט
   * (אין שינוי בתקציב כאן; אם תרצה להשפיע כאשר sum משתנה — ראה הערה בהמשך)
   */
  async update(projectId, id, updateData) {
    (projectId);
    // אופציונלי: מניעת שינוי projectId מבחוץ
    // delete updateData.projectId;
    if (updateData?.files) {
      updateData.files = normalizeFiles(updateData.files);
    }
    const updated = await Order.findOneAndUpdate(
      { _id: id, projectId },
      updateData,
      { new: true, runValidators: true }
    );
    return updated; // יכול להיות null
  },

  /**
   * 🗑️ מחיקה אטומית של הזמנה מהפרויקט
   * מקטין budget ו־remainingBudget לפי sum של ההזמנה
   */
  async remove(projectId, id) {
    (projectId);

    const session = await mongoose.startSession();
    try {
      let removed = null;
      await session.withTransaction(async () => {
        const order = await Order.findOne({ _id: id, projectId }).session(session);
        if (!order) return; // נשאר null

        const delta = Number(order.sum || 0);

        await Project.findByIdAndUpdate(
          projectId,
          {
            $pull: { orders: order._id },
            $inc:  { budget: -delta, remainingBudget: -delta },
          },
          { new: true, session }
        );

        await Order.deleteOne({ _id: id, projectId }).session(session);
        removed = order;
      });
      return removed; // null אם לא נמצא
    } finally {
      session.endSession();
    }
  },

  /**
   * 🔎 חיפוש חופשי בפרויקט (מחרוזת query חובה)
   */
  async search(query) {
    if (query === undefined || query === null) {
      throw new Error('מילת חיפוש לא נמצאה');
    }
    const regex = query === '0' || !isNaN(query) ? String(query) : new RegExp(String(query), 'i');
    return Order.find({ name: { $regex: regex } }).sort({ createdAt: -1 }).lean();
  },

  // ==== שמרתי למקרה שאתה עדיין קורא מהקוד הישן ====

  // קוד ישן: יצירה בלי projectId (לא בשימוש אחרי היישור)
  async createOrders(_) {
    throw new Error('use orderService.create(projectId, data) instead');
  },

  // קוד ישן: קבלת כל ההזמנות (לא מסונן)
  async getAllOrders() {
    const orders = await Order.find()
      .populate({ path: 'invitingName', select: 'orderNumber, projectName, projectId, sum, status,' })
      .sort({ createdAt: -1 });

    return orders.map(obj => {
      const ord = obj.toObject();
      return { ...ord, inviting: ord.invitingName || null };
    });
  },
  // קוד ישן: getById ללא projectId
  async getOrderById(id) {
    return Order.findById(id);
  },

  // קוד ישן: updateById ללא projectId
  async updateOrder(id, updateData) {
    return Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  },

  // קוד ישן: deleteById ללא projectId
  async deleteOrder(id) {
    // נשמר לתאימות אחורה – עדיף remove(projectId, id)
    const order = await Order.findById(id);
    if (!order) throw new Error('Order not found');
    if (!order.projectId) throw new Error('Order has no projectId');

    // מעדכן פרויקט כמו בקוד הישן שלך
    const delta = Number(order.sum) || 0;
    await Project.findByIdAndUpdate(
      order.projectId,
      { $pull: { orders: order._id }, $inc: { remainingBudget: -delta, budget: -delta } },
      { new: true }
    );
    await Order.findByIdAndDelete(id);
    return { order };
  },
};

export default orderService;
