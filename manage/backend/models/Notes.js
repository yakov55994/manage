import mongoose from "mongoose";

const notesSchema = new mongoose.Schema({
    text: { type: "string" },
    completed: { type: "boolean", default:false },
})

const Notes = mongoose.model('Notes', notesSchema);

export default Notes;