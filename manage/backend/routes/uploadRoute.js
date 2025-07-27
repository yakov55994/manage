import express from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs/promises'; // שימוש בגרסה אסינכרונית
import path from 'path';
import File from '../models/File.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const uploadsDir = path.resolve('uploads');

// יצירת תיקייה אם לא קיימת
fs.access(uploadsDir).catch(() => fs.mkdir(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^\w.-]/g, '_');
        cb(null, `${Date.now()}-${sanitizedName}`);
    }
});

const upload = multer({ storage });

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/temporary', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

    res.status(200).json({
        message: 'הקובץ נשמר באופן זמני',
        tempFilePath: req.file.path,
        originalName: req.file.originalname
    });
});

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

        const folder = req.body.folder;
        if (!['orders', 'invoices'].includes(folder)) {
            await fs.unlink(req.file.path); // מחיקת קובץ במידה ויש שגיאה
            return res.status(400).json({ error: 'יש לבחור תיקייה תקינה (orders או invoices)' });
        }

        const { originalname: fileName, path: filePath, mimetype, size } = req.file;
        const result = await cloudinary.v2.uploader.upload(filePath, {
            folder,
            resource_type: 'raw' // לא להסתמך על סוג אוטומטי
        });

        const newFile = new File({
            name: fileName,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
            folder,
            type: mimetype,
            size
        });

        await newFile.save();
        await fs.unlink(filePath); // שימוש ב-async/await למחיקה

        res.status(200).json({
            message: `הקובץ הועלה בהצלחה ל-${folder}`,
            file: newFile
        });
    } catch (error) {
        console.error('Upload error:', error);
        if (req.file && req.file.path) await fs.unlink(req.file.path).catch(() => {});
        res.status(500).json({ error: 'שגיאה בהעלאה', details: error.message });
    }
});

export default router;
