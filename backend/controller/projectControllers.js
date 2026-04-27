import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Project from "../models/Project.js";
import projectService from "../services/projectService.js";
import { sendError } from "../utils/sendError.js";
import { saveLog, getIp } from "../utils/logger.js";

const projectController = {

  async searchProjects (req, res) {
    try {
    const q = req.query.query || "";
    const results = await projectService.searchProjects(q);
    res.json(results);
  } catch (e) {
    console.error("❌ searchProjects ERROR:", e);
    saveLog({ type: 'error', message: `שגיאה בחיפוש פרויקטים — ${e.message}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { query: req.query.q } });
    res.status(500).json({ message: "Search failed" });
  }
},


  async getAllProjects(req, res) {
    try {
      const projects = await projectService.getAllProjects(req.user);
      res.json({ success: true, data: projects });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async getProjectById(req, res) {
  try {
    const projectId = req.params.projectId;

    const project = await projectService.getProjectById(req.user, projectId);

    if (!project) {
      return res.status(404).json({ message: "פרויקט לא נמצא" });
    }

    res.json({ success: true, data: project });

  } catch (e) {
    sendError(res, e, req);
  }
},

  async createBulkInvoices(req, res) {
    try {
      const invoices = await projectService.createBulkInvoices(
        req.user,
        req.params.projectId,
        req.body.invoices
      );
      saveLog({ type: 'info', message: `נוצרו ${invoices.length} חשבוניות בפרויקט ${req.params.projectId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { projectId: req.params.projectId, count: invoices.length } });
      res.status(201).json({ success: true, data: invoices });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async createProject(req, res) {
    try {
      const project = await projectService.createProject(req.user, req.body);
      saveLog({ type: 'info', message: `פרויקט נוצר — ${project.name || project._id}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { projectId: project._id, projectName: project.name } });
      res.status(201).json({ success: true, data: project });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async updateProject(req, res) {
    try {
      const updated = await projectService.updateProject(
        req.user,
        req.params.projectId,
        req.body
      );
      saveLog({ type: 'info', message: `פרויקט עודכן — ${updated.name || req.params.projectId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { projectId: req.params.projectId, projectName: updated.name } });
      res.json({ success: true, data: updated });
    } catch (e) {
      sendError(res, e, req);
    }
  },

  async deleteProject(req, res) {
    try {
      await projectService.deleteProject(req.user, req.params.projectId);
      saveLog({ type: 'info', message: `פרויקט נמחק — מזהה: ${req.params.projectId}`, username: req.user?.username || req.user?.name, userId: req.user?._id, ip: getIp(req), meta: { projectId: req.params.projectId } });
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      sendError(res, e, req);
    }
  }
};

export default projectController;
