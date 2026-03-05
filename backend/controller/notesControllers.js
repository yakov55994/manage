import notesService from '../services/notesService.js';
import Notes from '../models/Notes.js';
import cloudinary from '../config/cloudinary.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const uploadsDir = path.resolve('uploads');
fs.access(uploadsDir).catch(() => fs.mkdir(uploadsDir));

export const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `note_${Date.now()}${ext}`);
        }
    })
});

const notesControllers = {
    createNoteController: async (req, res) => {
        const { text } = req.body;
        try {
            const newNote = await notesService.createNote(text, req.user);
            res.status(201).json(newNote);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateNoteController: async (req, res) => {
        const { id } = req.params;
        const { text, completed } = req.body;
        try {
            const updatedNote = await notesService.updateNote(id, text, completed);
            res.status(200).json({ message: "ההערה עודכנה בהצלחה!", note: updatedNote });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    deleteNoteController: async (req, res) => {
        const { id } = req.params;
        try {
            const note = await Notes.findById(id);
            if (note) {
                // מחק כל הקבצים מ-Cloudinary
                for (const att of note.attachments || []) {
                    if (att.publicId) await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || 'auto' }).catch(() => {});
                }
                for (const comment of note.comments || []) {
                    for (const att of comment.attachments || []) {
                        if (att.publicId) await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || 'auto' }).catch(() => {});
                    }
                }
            }
            const deletedNote = await notesService.deleteNote(id);
            res.status(200).json({ message: "ההערה נמחקה בהצלחה!", note: deletedNote });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getAllNotesController: async (req, res) => {
        try {
            const notes = await notesService.getAllNotes();
            res.status(200).json(notes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ===== קבצים מצורפים למשימה =====
    addAttachmentController: async (req, res) => {
        const { id } = req.params;
        try {
            if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

            const filePath = req.file.path;
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'notes',
                resource_type: 'auto'
            });
            await fs.unlink(filePath).catch(() => {});

            const att = {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                name: req.file.originalname,
                type: req.file.mimetype
            };

            const note = await Notes.findByIdAndUpdate(
                id,
                { $push: { attachments: att } },
                { new: true }
            );
            res.json({ note, attachment: note.attachments[note.attachments.length - 1] });
        } catch (error) {
            if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
            res.status(500).json({ error: error.message });
        }
    },

    deleteAttachmentController: async (req, res) => {
        const { id, attId } = req.params;
        try {
            const note = await Notes.findById(id);
            if (!note) return res.status(404).json({ error: 'משימה לא נמצאה' });

            const att = note.attachments.id(attId);
            if (!att) return res.status(404).json({ error: 'קובץ לא נמצא' });

            if (att.publicId) {
                await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || 'auto' }).catch(() => {});
            }

            await Notes.findByIdAndUpdate(id, { $pull: { attachments: { _id: attId } } });
            res.json({ message: 'קובץ נמחק בהצלחה' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ===== תגובות (צ'אט) =====
    addCommentController: async (req, res) => {
        const { id } = req.params;
        const { text } = req.body;
        try {
            const comment = {
                text: text || "",
                createdBy: req.user?._id,
                createdByName: req.user?.username || req.user?.name || 'משתמש',
                createdAt: new Date(),
                attachments: []
            };

            // אם יש קובץ מצורף לתגובה
            if (req.file) {
                const filePath = req.file.path;
                const result = await cloudinary.uploader.upload(filePath, {
                    folder: 'notes/comments',
                    resource_type: 'auto'
                });
                await fs.unlink(filePath).catch(() => {});
                comment.attachments.push({
                    url: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type,
                    name: req.file.originalname,
                    type: req.file.mimetype
                });
            }

            const note = await Notes.findByIdAndUpdate(
                id,
                { $push: { comments: comment } },
                { new: true }
            );
            res.json({ note, comment: note.comments[note.comments.length - 1] });
        } catch (error) {
            if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
            res.status(500).json({ error: error.message });
        }
    },

    deleteCommentController: async (req, res) => {
        const { id, commentId } = req.params;
        try {
            const note = await Notes.findById(id);
            if (!note) return res.status(404).json({ error: 'משימה לא נמצאה' });

            const comment = note.comments.id(commentId);
            if (!comment) return res.status(404).json({ error: 'תגובה לא נמצאה' });

            // מחק קבצי התגובה מ-Cloudinary
            for (const att of comment.attachments || []) {
                if (att.publicId) await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || 'auto' }).catch(() => {});
            }

            await Notes.findByIdAndUpdate(id, { $pull: { comments: { _id: commentId } } });
            res.json({ message: 'תגובה נמחקה בהצלחה' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addCommentAttachmentController: async (req, res) => {
        const { id, commentId } = req.params;
        try {
            if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

            const filePath = req.file.path;
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'notes/comments',
                resource_type: 'auto'
            });
            await fs.unlink(filePath).catch(() => {});

            const att = {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                name: req.file.originalname,
                type: req.file.mimetype
            };

            const note = await Notes.findOneAndUpdate(
                { _id: id, 'comments._id': commentId },
                { $push: { 'comments.$.attachments': att } },
                { new: true }
            );
            res.json({ note });
        } catch (error) {
            if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
            res.status(500).json({ error: error.message });
        }
    }
};

export default notesControllers;
