import mongoose from 'mongoose';
import projectService from '../services/projectService.js';
import Project from '../models/Project.js';

const projectController = {

  // ➕ יצירת פרויקט חדש
  createProject: async (req, res) => {
    try {
      const { name, invitingName, Contact_person } = req.body;

      const existingProject = await Project.findOne({ name });
      if (existingProject) {
        return res.status(400).json({ error: 'פרויקט עם שם זה כבר קיים' });
      }

      const newProject = await projectService.createProject({
        name,
        invitingName,
        Contact_person,
      });

      return res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ error: error.message });
    }
  },

  // 🧾 הוספת חשבונית לפרויקט (בפועל מומלץ להעביר לחשבוניות /projects/:projectId/invoices)
  addInvoiceToProject: async (req, res) => {
    try {
      const { projectId } = req.params;
      const invoiceData = req.body;

      const newInvoice = await projectService.addInvoiceToProject(projectId, invoiceData);
      return res.status(201).json(newInvoice);
    } catch (error) {
      console.error("שגיאה בהוספת חשבונית:", error);
      return res.status(400).json({ error: error.message });
    }
  },

  // 📃 רשימת פרויקטים (מסוננים לפי הרשאות ב־middleware)
  getAllProjects: async (req, res) => {
    try {
      const { queryFilter } = req; // הוחדר ע"י applyProjectListFilter
      const projects = await projectService.getAllProjects(queryFilter);
      return res.status(200).json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת פרויקטים', error: error.message });
    }
  },

  // 📄 פרויקט לפי ID
  getProjectById: async (req, res) => {
   
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: 'הפרויקט לא נמצא' });
      }
      return res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project by ID:', error);
      return res.status(500).json({ message: 'שגיאה בשליפת פרויקט', error: error.message });
    }
  },

  // ✏️ עדכון פרויקט
  updateProject: async (req, res) => {
    const { projectId } = req.params;
    const projectData = req.body;

    try {
      // אם מגיע מערך orders מהפרונט - להפוך ל־ObjectId בלבד
      if (projectData.orders) {
        projectData.orders = projectData.orders.map(order => order.toString());
      }

      const updatedProject = await Project.findByIdAndUpdate(projectId, projectData, {
        new: true,
        runValidators: true
      }).populate('orders');

      if (!updatedProject) {
        return res.status(404).json({ message: 'פרויקט לא נמצא' });
      }

      return res.status(200).json(updatedProject);
    } catch (error) {
      console.error('Error in updateProject:', error);
      return res.status(500).json({ message: 'שגיאה בעדכון הפרויקט' });
    }
  },

  // 🗑️ מחיקת פרויקט
  deleteProject: async (req, res) => {
    const { projectId } = req.params;

    try {
      await projectService.deleteProjectById(projectId);
      return res.status(200).json({ message: 'הפרויקט נמחק בהצלחה' });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ message: error.message || 'שגיאה במחיקת הפרויקט' });
    }
  },

  // 🔎 חיפוש
  search: async (req, res) => {
    try {
      const { query } = req.query;
      const results = await projectService.search(query);
      return res.status(200).json(results);
    } catch (error) {
      console.error('שגיאה במהלך החיפוש: ', error);
      return res.status(500).json({ message: 'שגיאה במהלך החיפוש', error: error.message });
    }
  }
};

export default projectController;
