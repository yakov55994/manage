import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    url: String,
    publicId: String,
    resourceType: String,
    name: String,
    type: String
}, { _id: true });

const commentSchema = new mongoose.Schema({
    text: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    createdByName: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    attachments: [attachmentSchema]
});

const notesSchema = new mongoose.Schema({
    text: { type: String },
    completed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    createdByName: { type: String, required: false },
    attachments: [attachmentSchema],
    comments: [commentSchema]
}, { timestamps: true });

const Notes = mongoose.model('Notes', notesSchema);

export default Notes;
