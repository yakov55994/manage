import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";
import projectService from "../services/projectService.js";
import { sendError } from "../utils/sendError.js";

const projectController = {

  async searchProjects (req, res) {
    try {
    const q = req.query.query || "";
    const results = await projectService.searchProjects(q);
    res.json(results);
  } catch (e) {
    console.error("❌ searchProjects ERROR:", e);
    res.status(500).json({ message: "Search failed" });
  }
},


  async getAllProjects(req, res) {
    try {
      const projects = await projectService.getAllProjects(req.user);
      res.json({ success: true, data: projects });
    } catch (e) {
      sendError(res, e);
    }
  },

  async getProjectById(req, res) {
    const projectId = req.params.projectId;

    try {
      const project = await Project.findById(projectId);
      if (!project) throw new Error("פרויקט לא נמצא");

      const invoices = await Invoice.find({ projectId }).populate("supplierId", "name");
      const orders = await Order.find({ projectId });

      res.json({
        success: true,
        data: { ...project.toObject(), invoices, orders },
      });

    } catch (e) {
      sendError(res, e);
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
      sendError(res, e);
    }
  },

  async createProject(req, res) {
    try {
      const project = await projectService.createProject(req.user, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (e) {
      sendError(res, e);
    }
  },

  async updateProject(req, res) {
    try {
      const updated = await projectService.updateProject(
        req.user,
        req.params.projectId,
        req.body
      );
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e);
    }
  },

  async deleteProject(req, res) {
    try {
      await projectService.deleteProject(req.user, req.params.projectId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e);
    }
  }
};

export default projectController;
