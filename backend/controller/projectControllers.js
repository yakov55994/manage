// controllers/projectController.js
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";
import projectService from "../services/projectService.js";

const projectController = {

  async getAllProjects(req, res) {
    try {
      const projects = await projectService.getAllProjects(req.user);
      res.json({ success: true, data: projects });
    } catch (e) {
  return res.status(403).json({ message: "אין הרשאה" });
}

  },

  getProjectById: async (req, res) => {
    const projectId = req.params.projectId;

    console.log("📥 REQUEST PROJECT ID:", projectId);

    try {
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({ message: "פרויקט לא נמצא" });
      }

      const invoices = await Invoice.find({ projectId })
        .populate("supplierId", "name");

      const orders = await Order.find({ projectId });

      return res.json({
        success: true,
        data: {
          ...project.toObject(),
          invoices,
          orders,
        },
      });

    } catch (err) {
      console.error("❌ ERROR getProjectById:", err);
      res.status(500).json({ message: err.message });
    }
  },

  async createBulkInvoices(req, res) {
    try {
      const invoices = await projectService.createBulkInvoices(
        req.user,
        req.params.projectId,
        req.body.invoices
      );

      res.status(201).json({ success: true, data: invoices });
    } catch (e) {
      res.status(403).json({ success: false, message: e.message });
    }
  },
  async createProject(req, res) {
    try {
      const project = await projectService.createProject(req.user, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  async updateProject(req, res) {
    try {
      const updated = await projectService.updateProject(
        req.user,
        req.params.id,
        req.body
      );

      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(403).json({ message: e.message });
    }
  },

  async deleteProject(req, res) {
    console.log("🔥 DELETE PROJECT ROUTE HIT:", req.params.projectId);

    try {
      await projectService.deleteProject(req.user, req.params.projectId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      res.status(403).json({ message: e.message });
    }
  }
};

export default projectController;
