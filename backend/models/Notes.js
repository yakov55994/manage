import mongoose from "mongoose";

const notesSchema = new mongoose.Schema({
    text: { type: "string" },
    completed: { type: "boolean", default: false },
    // ✅ הוספה חדשה
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    createdByName: {
        type: String,
        required: false
    }
})

const Notes = mongoose.model('Notes', notesSchema);

export default Notes;