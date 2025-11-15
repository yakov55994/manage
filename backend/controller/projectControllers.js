import projectService from "../services/projectService.js";

const projectController = {
  createProject: async (req, res) => {
    try {
      const project = await projectService.createProject(req.body);
      res.status(201).json({ success: true, data: project });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  getAllProjects: async (req, res) => {
    try {
      const projects = await projectService.getAllProjects(req.queryFilter);
      res.json({ success: true, data: projects });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  getProjectById: async (req, res) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      if (!project) return res.status(404).json({ success: false, message: "לא נמצא" });

      res.json({ success: true, data: project });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  updateProject: async (req, res) => {
    try {
      const updated = await projectService.updateProject(req.params.projectId, req.body);
      if (!updated) return res.status(404).json({ success: false, message: "לא נמצא" });

      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  deleteProject: async (req, res) => {
    try {
      await projectService.deleteProjectById(req.params.projectId);
      res.json({ success: true, message: "נמחק" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  search: async (req, res) => {
    try {
      const results = await projectService.search(req.query.query);
      res.json({ success: true, data: results });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
};

export default projectController;
