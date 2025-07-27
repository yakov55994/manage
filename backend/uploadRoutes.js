import express from 'express';
import multer from 'multer';
import bucket from './firebase.js';
import Image from './models/Image.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// העלאה
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const blob = bucket.file(Date.now() + '-' + req.file.originalname);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype
      }
    });

    blobStream.end(req.file.buffer);

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      const image = await Image.create({ url: publicUrl, fileName: blob.name });
      res.status(200).json(image);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// מחיקה
router.delete('/delete/:fileName', async (req, res) => {
  try {
    const file = bucket.file(req.params.fileName);
    await file.delete();
    await Image.findOneAndDelete({ fileName: req.params.fileName });
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
