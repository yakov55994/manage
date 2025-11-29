import express from 'express';
import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
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

// Routes
router.delete('/delete-cloudinary', async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ 
        error: 'publicId is required',
        received: req.body 
      });
    }

    const result = await cloudinary.v2.uploader.destroy(publicId, {
      resource_type: resourceType || 'raw'
    });

    if (result.result === 'ok') {
      res.json({ 
        success: true, 
        message: 'קובץ נמחק בהצלחה מ-Cloudinary',
        result: result 
      });
    } else if (result.result === 'not found') {
      res.json({ 
        success: true, 
        message: 'הקובץ לא נמצא ב-Cloudinary (אולי כבר נמחק)',
        result: result 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'מחיקה נכשלה',
        result: result 
      });
    }
  } catch (error) {
    console.error('❌ שגיאה במחיקת קובץ מ-Cloudinary:', error);
    res.status(500).json({ 
      error: 'שגיאה במחיקת הקובץ מ-Cloudinary',
      details: error.message 
    });
  }
});

router.post('/temporary', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

    res.status(200).json({
        message: 'הקובץ נשמר באופן זמני',
        tempFilePath: req.file.path,
        originalName: req.file.originalname
    });
});

// ✅ העלאת קובץ - עם publicId ו-resourceType
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'לא נבחר קובץ' });
        }

        const folder = req.body.folder || 'general';
        const { originalname: fileName, path: filePath, mimetype, size } = req.file;
        
        const result = await cloudinary.v2.uploader.upload(filePath, {
            folder,
            resource_type: 'raw'
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
        await fs.unlink(filePath);

        // ✅ החזר אובייקט מפורש עם כל השדות!
        const responseFile = {
            _id: newFile._id.toString(),
            name: newFile.name,
            url: newFile.url,
            publicId: newFile.publicId,           // ✅ חשוב!
            resourceType: newFile.resourceType,   // ✅ חשוב!
            folder: newFile.folder,
            type: newFile.type,
            size: newFile.size
        };


        res.status(200).json({
            message: `הקובץ הועלה בהצלחה ל-${folder}`,
            file: responseFile
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ 
            error: 'שגיאה בהעלאה', 
            details: error.message 
        });
    }
});

router.delete('/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'קובץ לא נמצא במסד' });

    const result = await cloudinary.v2.uploader.destroy(file.publicId, {
      resource_type: file.resourceType || 'raw'
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`מחיקה מקלאודינרי נכשלה: ${result.result}`);
    }

    await File.findByIdAndDelete(req.params.fileId);

    res.json({ 
        message: 'הקובץ נמחק מהמערכת ומ־Cloudinary בהצלחה', 
        cloudinary: result 
    });
  } catch (error) {
    console.error('❌ שגיאה במחיקת קובץ:', error);
    res.status(500).json({ 
        error: 'שגיאה במחיקת הקובץ', 
        details: error.message 
    });
  }
});

export default router;