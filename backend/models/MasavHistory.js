import mongoose from "mongoose";

const MasavPaymentSchema = new mongoose.Schema({
  supplierName: { type: String },
  bankNumber: { type: String },
  branchNumber: { type: String },
  accountNumber: { type: String },
  amount: { type: Number },
  internalId: { type: String },
  invoiceNumbers: { type: String },
  projectNames: { type: String },
  bankName: { type: String },
}, { _id: false });

const MasavHistorySchema = new mongoose.Schema({
  executionDate: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
  },
  companyInfo: {
    instituteId: { type: String },
    senderId: { type: String },
    companyName: { type: String },
  },
  payments: [MasavPaymentSchema],
  invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
  totalAmount: { type: Number, default: 0 },
  totalPayments: { type: Number, default: 0 },
  fileName: { type: String },
  masavFileBase64: { type: String },
  pdfFileBase64: { type: String },
}, { timestamps: true });

MasavHistorySchema.index({ generatedAt: -1 });

const MasavHistory = mongoose.model("MasavHistory", MasavHistorySchema);

export default MasavHistory;
