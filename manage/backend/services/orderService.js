import Order from '../models/Order.js';
import Project from '../models/Project.js';
const orderService = {
  // יצירת הזמנה חדשה עם כל הפרטים הנדרשים מהסכמה
  createOrders: async (ordersData) => {
    try {
      // בדוק אם כל שם של מזמין כבר קיים בהזמנות קיימות
      for (let orderData of ordersData) {
        // בדיקת שדות ריקים (האם כל שדה נדרש מולא)
        if (!orderData.orderNumber || !orderData.invitingName || !orderData.detail || !orderData.projectName
          || !orderData.sum || !orderData.status || !orderData.Contact_person || ! orderData.createdAt ) {
          console.error(`הזמנה חסרה שדות חובה: ${JSON.stringify(orderData)}`);
          throw new Error(`יש למלא את כל השדות להזמנה.`);
        }
      }
      for (let orderData of ordersData) {
        const existingOrder = await Order.findOne({ orderNumber: orderData.orderNumber });
        if (existingOrder) {
          console.error(`מספר הזמנה עבור לקוח ${orderData.invitingName} כבר קיימת`);
throw new Error(`הזמנה עם מספר ${orderData.orderNumber} עבור הלקוח ${orderData.invitingName} כבר קיימת`);
        }
      }

      // יצירת כל ההזמנות במכה אחת
      const newOrders = await Order.insertMany(ordersData);

      // עדכון פרויקטים במקביל
      const updates = newOrders.map(order => ({
        updateOne: {
          filter: { _id: order.projectId },
          update: {
            $push: { orders: order },
            $inc: { budget: order.sum, remainingBudget: order.sum }
          }
        }
      }));

      await Project.bulkWrite(updates);

      return newOrders;
    } catch (err) {
      console.error('שגיאה ביצירת הזמנות:', err);
      throw new Error(`${err.message}`);
    }
  },


  deleteOrder: async (id) => {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found");

    // מצא את הפרויקט
    const project = await Project.findById(order.projectId);
    if (!project) throw new Error("Project not found");

    // מסנן את המערך orders כדי להסיר את ההזמנה
    project.orders = project.orders.filter(o => !o._id.equals(order._id));

    // עדכון התקציב
    project.remainingBudget -= order.sum;
    project.budget -= order.sum;

    // שמירת השינויים
    await project.save();

    // מחיקת ההזמנה
    await Order.findByIdAndDelete(id);
    return order;
  },

  // עדכון הזמנה – מאפשר לעדכן שדות לפי מה שנשלח ב-body (מעודכן גם את runValidators)
  updateOrder: async (id, updateData) => {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      if (!updatedOrder) throw new Error('Order not found');
      return updatedOrder;
    } catch (error) {
      console.error('שגיאה בעדכון הזמנה:', error);
      throw error;
    }
  },
  // קבלת כל ההזמנות
  getAllOrders: async () => {
    const orders = await Order.find();
    return orders;
  },

  // חיפוש – לדוגמה, ניתן להרחיב חיפוש לפי פרמטרים עתידיים
  search: async (query) => {
  try {
    if (!query && query !== '0') {
      throw new Error('מילת חיפוש לא נמצאה');
    }

    // ✅ בנה את מערך התנאים בצורה ברורה
    const searchConditions = [
      // חיפוש בשדות טקסט
      { projectName: { $regex: query, $options: 'i' } },
      { invitingName: { $regex: query, $options: 'i' } },
      { detail: { $regex: query, $options: 'i' } }
    ];

    // ✅ אם query הוא מספר, הוסף תנאי מספרים
    if (!isNaN(query)) {
      searchConditions.push({ orderNumber: parseInt(query) });
      searchConditions.push({ sum: parseFloat(query) });
    }

    console.log('🔍 Search conditions:', searchConditions); // דיבוג

    const orders = await Order.find({
      $or: searchConditions
    });

    console.log('✅ Found orders:', orders.length); // דיבוג

    return orders;
    
  } catch (error) {
    console.error("❌ שגיאה במהלך החיפוש:", error.message);
    throw new Error("שגיאה בזמן החיפוש");
  }
},
  // קבלת הזמנה לפי ה-ID
  getOrderById: async (id) => {
    const order = await Order.findById(id);
    if (!order) throw new Error('Order not found');
    return order;
  },
};

export default orderService;
