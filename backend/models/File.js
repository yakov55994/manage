import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: String,
  url: String,
  folder: String,
  type: String,
  size: Number,
  supplierId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Supplier",
  required: false
},

});

const File = mongoose.model("File", fileSchema);

export default File;
