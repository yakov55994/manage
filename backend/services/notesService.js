import Notes from '../models/Notes.js'; // מייבא את המודל של Notes

const notesService = {
    createNote: async (text) => {
        try {
            const newNote = new Notes({ text });
            await newNote.save();
            return newNote;
        } catch (error) {
            throw new Error("שגיאה ביצירת ההערה");
        }
    },

    // עדכון הערה
    updateNote: async (id, text, completed) => {
        try {
            const updatedNote = await Notes.findByIdAndUpdate(
                id,
                { text, completed },
                { new: true } // מחזיר את ההערה המעודכנת
            );
            if (!updatedNote) {
                throw new Error("ההערה לא נמצאה");
            }
            return updatedNote;
        } catch (error) {
            throw new Error("שגיאה בעדכון ההערה");
        }
    },

    // מחיקת הערה
    deleteNote: async (id) => {
        try {
            const deletedNote = await Notes.findByIdAndDelete(id);
            if (!deletedNote) {
                throw new Error("ההערה לא נמצאה");
            }
            return deletedNote;
        } catch (error) {
            throw new Error("שגיאה במחיקת ההערה");
        }
    },

    // קבלת כל ההערות
    getAllNotes: async () => {
        try {
            const notes = await Notes.find();
            return notes;
        } catch (error) {
            throw new Error("שגיאה בקבלת ההערות");
        }
    }
};

export default notesService;
