import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: String,
  url: String,
  folder: String,
  type: String,
  size: Number
});

const File = mongoose.model("File", fileSchema);

export default File;
