import express from 'express'
import notesController, { upload } from '../controller/notesControllers.js'
import { protect } from '../middleware/auth.js'

const router = express.Router();

// CRUD בסיסי
router.post('/', protect, notesController.createNoteController);
router.put('/:id', protect, notesController.updateNoteController);
router.delete('/:id', protect, notesController.deleteNoteController);
router.get('/', protect, notesController.getAllNotesController);

// קבצים מצורפים למשימה
router.post('/:id/attachments', protect, upload.single('file'), notesController.addAttachmentController);
router.delete('/:id/attachments/:attId', protect, notesController.deleteAttachmentController);

// תגובות (צ'אט)
router.post('/:id/comments', protect, upload.single('file'), notesController.addCommentController);
router.delete('/:id/comments/:commentId', protect, notesController.deleteCommentController);
router.post('/:id/comments/:commentId/attachments', protect, upload.single('file'), notesController.addCommentAttachmentController);

export default router;
