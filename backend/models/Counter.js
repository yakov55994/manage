import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

// אטומי – מחזיר את המספר הבא ומגדיל ב-1
counterSchema.statics.getNextSequence = async function (counterName) {
  const counter = await this.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// מחזיר כמה מספרים רצופים (לקבצים מרובים)
counterSchema.statics.getNextSequenceBatch = async function (counterName, count) {
  const counter = await this.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  // counter.seq הוא המספר האחרון שהוקצה
  const start = counter.seq - count + 1;
  return Array.from({ length: count }, (_, i) => start + i);
};

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;
