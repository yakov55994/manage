// controllers/supplierController.js
import supplierService from "../services/supplierService.js";

const supplierController = {
    async getSuppliersByProject(req, res) {
        try {
            const suppliers = await supplierService.getSuppliersByProject(req.params.projectId);
            res.json(suppliers);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },

    async createSupplier(req, res) {
        try {
            const supplier = await supplierService.createSupplier(req.params.projectId, req.body);
            res.status(201).json(supplier);
        } catch (e) {
            res.status(400).json({ message: e.message });
        }
    },

    async getSupplierById(req, res) {
        try {
            const supplier = await supplierService.getSupplierById(
                req.params.projectId,
                req.params.id
            );
            if (!supplier)
                return res.status(404).json({ message: "לא נמצא" });

            res.json(supplier);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    },

    async updateSupplier(req, res) {
        try {
            const supplier = await supplierService.updateSupplier(
                req.params.projectId,
                req.params.id,
                req.body
            );

            if (!supplier)
                return res.status(404).json({ message: "לא נמצא" });

            res.json(supplier);
        } catch (e) {
            res.status(400).json({ message: e.message });
        }
    },

    async deleteSupplier(req, res) {
        try {
            const deleted = await supplierService.deleteSupplier(
                req.params.projectId,
                req.params.id
            );

            if (!deleted)
                return res.status(404).json({ message: "לא נמצא" });

            res.json({ message: "נמחק" });
        } catch (e) {
            res.status(400).json({ message: e.message });
        }
    },

    async search(req, res) {
        try {
            const results = await supplierService.search(
                req.params.projectId,
                req.query.q
            );
            res.json(results);
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
};

export default supplierController;
