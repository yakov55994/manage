import mongoose from "mongoose";

const notesSchema = new mongoose.Schema({
    text: { type: "string" },
    completed: { type: "boolean", default:false },
    userName: { type: String, required: true }, // הוסף שדה זה

})

const Notes = mongoose.model('Notes', notesSchema);

export default Notes;