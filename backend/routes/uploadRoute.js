import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js'; // ✅ שינוי כאן
import fs from 'fs/promises';
import path from 'path';
import File from '../models/File.js';
import JSZip from "jszip";
import fetch from "node-fetch";
import { format } from "date-fns";


const router = express.Router();
const uploadsDir = path.resolve('uploads');

// יצירת תיקייה אם לא קיימת
fs.mkdir(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),

  filename: (req, file, cb) => {
    // קבלת סיומת (למשל .png .jpg .pdf)
    const ext = path.extname(file.originalname);

    // תאריך יפה
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

    // שם נקי באנגלית (לפי סוג התיקייה)
    const folder = req.body.folder || "upload";

    // יצירת שם:
    // upload_2025-12-29_14-30-55.png
    const safeName = `${folder}_${timestamp}${ext}`;

    cb(null, safeName);
  }
});


const upload = multer({ storage });

// ❌ הסר את זה - עכשיו זה ב-config
// cloudinary.v2.config({...})

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

    const result = await cloudinary.uploader.destroy(publicId, { // ✅ cloudinary כבר מוגדר כ-v2
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

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'לא נבחר קובץ' });
    }

    const folder = req.body.folder || 'general';
    const filePath = req.file.path;

    // 🔥 שם נקי ותקין שנוצר ע"י multer
    const safePublicId = path.parse(req.file.filename).name;

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: safePublicId, // ← חובה
      resource_type: 'auto'    // ← תקין
    });

    const newFile = new File({
      name: req.file.filename,       // ← שם נקי, NOT originalname
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      folder,
      type: req.file.mimetype,
      size: req.file.size
    });

    await newFile.save();
    await fs.unlink(filePath);

    res.status(200).json({
      message: `הקובץ הועלה בהצלחה`,
      file: {
        name: newFile.name,
        url: newFile.url,
        publicId: newFile.publicId,
        resourceType: newFile.resourceType,
        type: newFile.type,
        size: newFile.size
      }
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

    const result = await cloudinary.uploader.destroy(file.publicId, { // ✅ שינוי כאן
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

// ======================================================
// 🆕 הורדת ZIP דרך השרת (פתרון ל-NetFree)
// ======================================================
router.post("/download-zip", async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "לא התקבלו קבצים ליצירת ZIP" });
    }
    const zip = new JSZip();

    for (const file of files) {
      try {
        let url = file.url;

        // בדיקה שה-URL תקף
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
          continue;
        }

        let response = await fetch(url);

        // 🔥 fallback לבעיית /raw/upload ב־Cloudinary (מאוד נפוץ)
        if (!response.ok && url.includes("/raw/upload/")) {
          const altUrl = url.replace("/raw/upload/", "/image/upload/");
          response = await fetch(altUrl);
        }

        if (!response.ok) {
          continue;
        }

        const buffer = await response.buffer();

        // שם קובץ נקי ויפה
        const safeName =
          `${file.projectName}_${file.supplierName}_חשבונית_${file.invoiceNumber}_${file.name}`
            .replace(/[^\u0590-\u05FF\w.-]/g, "_")
            .replace(/\s+/g, "_");

        zip.file(safeName, buffer);
      } catch (err) {
        console.error("❌ שגיאה בהורדת קובץ יחיד:", err);
      }
    }

    const zipData = await zip.generateAsync({ type: "nodebuffer" });

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=files_${Date.now()}.zip`,
    });

    res.send(zipData);

  } catch (error) {
    console.error("❌ ZIP ERROR:", error);
    res.status(500).json({
      error: "שגיאה ביצירת קובץ ZIP",
      details: error.message,
    });
  }
});


export default router;