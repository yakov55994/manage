import express from 'express';
import projectControllers from '../controller/projectControllers.js'

const router = express.Router();

router.get('/search', projectControllers.search);

router.post("/", projectControllers.createProject);

router.post('/:id/invoices', projectControllers.addInvoiceToProject);

router.get('/', projectControllers.getAllProjects);

router.get('/:id', projectControllers.getProjectById); 

router.put('/:id', projectControllers.updateProject);

router.delete('/:id', projectControllers.deleteProject);


export default router;