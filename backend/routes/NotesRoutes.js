import express from 'express'
import notesController from '../controller/notesControllers.js'
import {protect} from '../middleware/auth.js'

const router = express.Router();

router.post('/', protect, notesController.createNoteController);

router.put('/:id', protect, notesController.updateNoteController);

router.delete('/:id', protect, notesController.deleteNoteController);

router.get('/', protect, notesController.getAllNotesController);

export default router;