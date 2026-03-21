import MasavBroadcast from "../models/MasavBroadcast.js";

export default {
  // העלאת קובץ מסב ששודר
  async upload(req, res) {
    try {
      const { month, fileName, fileBase64, fileType, fileSize, notes } = req.body;

      if (!month || !fileName || !fileBase64) {
        return res.status(400).json({ error: "חסרים שדות חובה" });
      }

      // ולידציה של פורמט חודש
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: "פורמט חודש לא תקין, נדרש YYYY-MM" });
      }

      const record = await MasavBroadcast.create({
        month,
        fileName,
        fileBase64,
        fileType: fileType || "application/octet-stream",
        fileSize: fileSize || 0,
        notes: notes || "",
        uploadedBy: {
          userId: req.user?._id || null,
          userName: req.user?.username || req.user?.name || "לא ידוע",
        },
      });

      res.status(201).json({ success: true, data: { ...record.toObject(), fileBase64: undefined } });
    } catch (err) {
      console.error("Error uploading masav broadcast:", err);
      res.status(500).json({ error: err.message });
    }
  },

  // רשימת כל הקבצים (מקובצים לפי חודש)
  async getAll(req, res) {
    try {
      const records = await MasavBroadcast.find()
        .select("-fileBase64")
        .sort({ month: -1, uploadedAt: -1 })
        .lean();

      res.json({ success: true, data: records });
    } catch (err) {
      console.error("Error fetching masav broadcasts:", err);
      res.status(500).json({ error: err.message });
    }
  },

  // הורדת קובץ
  async download(req, res) {
    try {
      const { id } = req.params;
      const record = await MasavBroadcast.findById(id);

      if (!record) {
        return res.status(404).json({ error: "קובץ לא נמצא" });
      }

      const buffer = Buffer.from(record.fileBase64, "base64");
      const encodedFileName = encodeURIComponent(record.fileName);

      res.writeHead(200, {
        "Content-Type": record.fileType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": buffer.length,
      });

      res.end(buffer);
    } catch (err) {
      console.error("Error downloading masav broadcast:", err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  },

  // מחיקת קובץ
  async delete(req, res) {
    try {
      const { id } = req.params;
      const record = await MasavBroadcast.findByIdAndDelete(id);

      if (!record) {
        return res.status(404).json({ error: "קובץ לא נמצא" });
      }

      res.json({ success: true, message: "הקובץ נמחק בהצלחה" });
    } catch (err) {
      console.error("Error deleting masav broadcast:", err);
      res.status(500).json({ error: err.message });
    }
  },
};
