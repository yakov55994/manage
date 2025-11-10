import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js'
import Order from '../models/Order.js'

const projectService = {

 createProject: async (data) => {
  try {
    const cleanedData = {
      ...data,
      name: data.name.trim(), // ניקוי רווחים בזמן היצירה
    };
    const newProject = new Project(cleanedData);
    await newProject.save();
    return newProject;
  } catch (error) {
    throw new Error('Error creating project');
  }
},

  addInvoiceToProject: async (projectId, invoiceData) => {
    try {
      // בדיקת תקינות ה-ID
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("ה-ID של הפרויקט לא תקין");
      }

      // שליפת הפרויקט
      const project = await Project.findById(projectId).populate('invoices');
      if (!project) throw new Error("פרויקט לא נמצא");


      const existingInvoice = await Invoice.findOne({
        invoiceNumber: invoiceData.invoiceNumber,
        invitingName: invoiceData.invitingName
      });

      if (existingInvoice) {
        throw new Error(`חשבונית מספר "${invoiceData.invoiceNumber}" כבר קיימת עבור המזמין "${invoiceData.invitingName}"`);
      }

      // יצירת חשבונית חדשה
      const newInvoice = new Invoice({
        invoiceNumber: invoiceData.invoiceNumber,
        projectName: project.name,
        projectId: project._id,
        sum: invoiceData.sum,
        status: invoiceData.status,
        invitingName: invoiceData.invitingName,
        detail: invoiceData.detail,
        paid: invoiceData.paid,
        paymentDate: invoiceData.paymentDate,
        createdAt: invoiceData.createdAt,
        file: invoiceData.file,
      });

      // שמירת החשבונית במסד הנתונים
      await newInvoice.save();


      if (typeof project.remainingBudget !== "number" || isNaN(project.remainingBudget)) {
        project.remainingBudget = 0;  // אם remainingBudget לא מוגדר או לא תקין, נגדיר אותו כ- 0
      }
      // עדכון התקציב הנותר בפרויקט
      project.remainingBudget -= invoiceData.sum;

      // הוספת אובייקט החשבונית למערך ה-invoices של הפרויקט
      project.invoices.push({
        _id: newInvoice._id,
        invoiceNumber: newInvoice.invoiceNumber,
        projectName: newInvoice.projectName,
        sum: newInvoice.sum,
        status: newInvoice.status,
        invitingName: newInvoice.invitingName,
        detail: newInvoice.detail,
        paid: newInvoice.paid,
        paymentDate: newInvoice.paymentDate,
        createdAt: newInvoice.createdAt,
        file: newInvoice.file,
      });

      // שמירת השינויים בפרויקט
      await project.save();

      return newInvoice;
    } catch (error) {
      throw new Error(error.message || "שגיאה כללית בהוספת חשבונית");
    }
  },

  getAllProjects: async () => {
    try {
      const projects = await Project.find();
      return projects;
    } catch (error) {
      console.error('Error fetching projects from DB:', error);
      throw new Error('שגיאה בשליפת פרויקטים מבסיס הנתונים');
    }
  },

  getProjectById: async (id) => {
    try {
      const project = await Project.findById(id);
      return project;
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      throw new Error('שגיאה בשליפת פרויקט');
    }
  },

  updateProject: async (id, projectData) => {
    try {
      // עדכון נתוני הפרויקט כולל התקציב הנותר
      const updatedProject = await Project.findByIdAndUpdate(
        id,
        {
          remainingBudget: projectData.remainingBudget, // עדכון התקציב הנותר
        },
        { new: true, runValidators: true }
      );

      return updatedProject;
    } catch (error) {
      console.error('Service update error:', error);
      throw new Error('שגיאה בעדכון הפרויקט');
    }
  },
  deleteProjectById: async (id) => {
    try {
      // בדיקת תקינות ה-ID
      if (!id) {
        throw new Error("❌ ID של הפרויקט לא סופק");
      }

      // חיפוש הפרויקט
      const project = await Project.findById(id);
      if (!project) {
        throw new Error("⚠️ פרויקט לא נמצא בבסיס הנתונים");
      }

      // מחיקת כל החשבוניות שקשורות לפרויקט לפי projectName
      const invoicesToDelete = await Invoice.deleteMany({ projectName: project.name });
      // console.log(`✅ נמחקו ${invoicesToDelete.deletedCount} חשבוניות`);

      // מחיקת כל ההזמנות שקשורות לפרויקט לפי projectName
      const ordersToDelete = await Order.deleteMany({ projectName: project.name });
      // console.log(`✅ נמחקו ${ordersToDelete.deletedCount} הזמנות`);

      // מחיקת הפרויקט
      const deletedProject = await Project.findByIdAndDelete(id);
      if (!deletedProject) {
        throw new Error("❌ שגיאה במחיקת הפרויקט");
      }

      return { message: "✅ הפרויקט, כל ההזמנות וכל החשבוניות המשויכות אליו נמחקו בהצלחה" };

    } catch (error) {
      console.error("❌ שגיאה במחיקת הפרויקט:", error.message);
      throw new Error(error.message || "❌ שגיאה לא ידועה במחיקת הפרויקט");
    }
  },
  search: async (query) => {
    try {
      if (query === undefined || query === null) {
        throw new Error('מילת חיפוש לא נמצאה');
      }

      let regexQuery;

      // אם ה-query הוא מספר או '0', מתייחסים אליו כמספר
      if (query === '0' || !isNaN(query)) {
        regexQuery = query; // חיפוש לפי מספר
      } else {
        // חיפוש לפי שם – מאפשר התאמה חלקית גם לאותיות וגם למספרים
        regexQuery = new RegExp(query, 'i'); // 'i' - לא מתחשב באותיות רישיות
      }

      const projects = await Project.find({
        name: { $regex: regexQuery }  // חיפוש לפי שם בלבד
      });

      return { projects };
    } catch (error) {
      console.error('שגיאה במהלך החיפוש:', error.message);
      throw new Error('שגיאה בזמן החיפוש');
    }
  },

  getOrdersByProjectId: async (projectId) => {
    try {
      const project = await Project.findById(projectId);
      if (!project) throw new Error("Project not found");
      return project.orders;  // מחזיר את כל פרטי ההזמנות מתוך הפרויקט
    } catch (error) {
      throw new Error(error.message || "Error fetching orders");
    }
  },
  
}

export default projectService;
