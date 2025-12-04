import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  folder: { type: String },
  type: { type: String, required: true },
  size: { type: Number, required: true },

  // 🔥 שני השדות שגרמו לבעיה
  publicId: { type: String, required: true },
  resourceType: { type: String, required: true },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: false
  }
});

const File = mongoose.model("File", fileSchema);

export default File;
