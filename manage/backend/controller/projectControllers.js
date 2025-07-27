import mongoose from 'mongoose';
import projectService from '../services/projectService.js'
import Project from '../models/Project.js';
import orderService from '../services/orderService.js'

const projectController = {

  createProject: async (req, res) => {
  try {
    const { name, invitingName, Contact_person, supplierId } = req.body; // ✅ הוסף supplierId

    const existingProject = await Project.findOne({ name });
    if (existingProject) {
      return res.status(400).json({ error: 'פרויקט עם שם זה כבר קיים' });
    }

    const newProject = await projectService.createProject({ 
      name, 
      invitingName, 
      Contact_person,
      supplierId // ✅ העבר את supplierId לסרוויס
    });

    // ✅ עדכון הספק - הוספת הפרויקט אליו
    if (supplierId) {
      await Supplier.findByIdAndUpdate(supplierId, {
        $push: { projects: newProject._id }
      });
    }

    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
},

  addInvoiceToProject: async (req, res) => {
    try {
      const { id } = req.params; // קבלת מזהה הפרויקט
      const invoiceData = req.body; // נתוני החשבונית מהבקשה

      const newInvoice = await projectService.addInvoiceToProject(id, invoiceData);

      res.status(201).json(newInvoice);
    } catch (error) {
      console.error("שגיאה בהוספת חשבונית:", error.message);
      res.status(400).json({ error: error.message }); // מחזיר שגיאה ללקוח בפרונט
  }
  },

  getAllProjects: async (req, res) => {
    try {
      const projects = await projectService.getAllProjects();
      return res.status(200).json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת פרויקטים', error: error.message });
    }
  },

  getProjectById: async (req, res) => {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ה-ID לא תקין" });
    }

    try {
      const project = await projectService.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'הפרויקט לא נמצא' });
      }
      return res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת פרויקט', error: error.message });
    }
  },

  updateProject: async (req, res) => {
    const { id } = req.params;
    const projectData = req.body;
  
    try {
      // אם יש שדה של orders בנתונים שמתקבלים, נשאיר אותם כמזהים בלבד
      if (projectData.orders) {
        // אנחנו רק עובר על המערך ומוודאים שהמזהים הם מיתרים ולא אובייקטים
        projectData.orders = projectData.orders.map(orderId => orderId.toString());
      }
  
      // עדכון הפרויקט עם המידע החדש
      const updatedProject = await Project.findByIdAndUpdate(id, projectData, {
        new: true,
        runValidators: true
      }).populate('orders'); // כאן אנחנו מבצעים את ה-populate על ההזמנות
  
      if (!updatedProject) {
        return res.status(404).json({ message: 'פרויקט לא נמצא' });
      }
  
      res.status(200).json(updatedProject);
    } catch (error) {
      console.error('Error in updateProject:', error);
      res.status(500).json({ message: 'שגיאה בעדכון הפרויקט' });
    }
  },
  

  deleteProject: async (req, res) => {
    const { id } = req.params;

    try {
      await projectService.deleteProjectById(id);
      return res.status(200).json({ message: 'הפרויקט נמחק בהצלחה' });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ message: error.message || 'שגיאה במחיקת הפרויקט' });
    }
  },


  search: async (req, res) => {
    try {
      const { query } = req.query; // מקבלים את מילת החיפוש מתוך ה-URL
      const results = await projectService.search(query); // שולחים את מילת החיפוש לשירות
      res.status(200).json(results); // מחזירים את התוצאות
    } catch (error) {
      console.error('שגיאה במהלך החיפוש: ', error); // הדפסת שגיאה
      res.status(500).json({ message: 'שגיאה במהלך החיפוש', error: error.message });
    }
  }
}
export default projectController;