import express from 'express'
import notesController from '../controller/notesControllers.js'

const router = express.Router();

router.post('/', notesController.createNoteController);

// עדכון הערה
router.put('/:id', notesController.updateNoteController);

// מחיקת הערה
router.delete('/:id', notesController.deleteNoteController);

// קבלת כל ההערות
router.get('/', notesController.getAllNotesController);

export default router;