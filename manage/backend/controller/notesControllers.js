import notesService from '../services/notesService.js'; // מייבא את הסרוויס

const notesControllers = {
    // יצירת הערה
    createNoteController: async (req, res) => {
        const { text } = req.body;
        try {
            const newNote = await notesService.createNote(text); // קורא לפונקציה בסרוויס
            res.status(201).json({ message: "ההערה נוצרה בהצלחה!", note: newNote });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // עדכון הערה
    updateNoteController: async (req, res) => {
        const { id } = req.params;
        const { text, completed } = req.body;
        try {
            const updatedNote = await notesService.updateNote(id, text, completed); // קורא לפונקציה בסרוויס
            res.status(200).json({ message: "ההערה עודכנה בהצלחה!", note: updatedNote });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // מחיקת הערה
    deleteNoteController: async (req, res) => {
        const { id } = req.params;
        try {
            const deletedNote = await notesService.deleteNote(id); // קורא לפונקציה בסרוויס
            res.status(200).json({ message: "ההערה נמחקה בהצלחה!", note: deletedNote });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // קבלת כל ההערות
    getAllNotesController: async (req, res) => {
        try {
            const notes = await notesService.getAllNotes(); // קורא לפונקציה בסרוויס
            res.status(200).json(notes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
};

export default notesControllers;
