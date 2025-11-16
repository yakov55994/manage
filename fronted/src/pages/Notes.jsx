import React, { useEffect, useState } from "react";
import api from '../api/api.jsx';
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Check, X, CheckCircle2, Circle, Target, FileText } from "lucide-react";

const Notes = () => {
    const [inputText, setInputText] = useState("");
    const [notes, setNotes] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);

    // טעינת הרשומות בעליה ראשונה
    useEffect(() => {
        fetchNotes();
    }, []);

    const handleTextChange = (event) => {
        setInputText(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!inputText.trim()) {
            toast.error("אנא כתוב משימה", {
                className: "sonner-toast error rtl"
            });
            return;
        }

        if (editId) {
            handleEdit(editId);
        } else {   
            try {
                const response = await api.post('/notes', { 
                    text: inputText
                });
                
                // בדיקה אם התגובה תקינה
                const newNote = response.data.note || response.data;
                if (newNote && newNote._id) {
                    setNotes([...notes, newNote]);
                    toast.success("המשימה נוצרה בהצלחה! 🎉", {
                        className: "sonner-toast success rtl"
                    });
                    setInputText("");
                } else {
                    throw new Error("תגובה לא תקינה מהשרת");
                }
            } catch (error) {
                console.error("Error sending data", error);
                console.error("Error response:", error.response?.data);
                toast.error("הייתה שגיאה בשליחת הנתונים", {
                    className: "sonner-toast error rtl"
                });
            }
        }
    };

    const fetchNotes = async () => {
        try {
            const res = await api.get('/notes');
            // סינון נתונים לא תקינים
            const validNotes = res.data.filter(note => note && typeof note === 'object' && note._id);
            setNotes(validNotes);
        } catch (error) {
            toast.error("שגיאה בשליפת המשימות", {
                className: "sonner-toast error rtl"
            });
            setNotes([]); // הגדרת ברירת מחדל במקרה של שגיאה
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notes/${id}`);
            setNotes(notes.filter((n) => n._id !== id));
            toast.success("המשימה נמחקה בהצלחה! 🗑️", {
                className: "sonner-toast success rtl"
            });
        } catch (error) {
            toast.error("המחיקה נכשלה", {
                className: "sonner-toast error rtl"
            });
        }
    };

    const handleEdit = async (id) => {
        try {
            await api.put(`/notes/${id}`, { 
                text: inputText
            });
            setNotes(notes.map((n) => (n._id === id ? { ...n, text: inputText } : n)));
            setInputText("");
            setEditId(null);
            toast.success("העריכה בוצעה בהצלחה! ✨", {
                className: "sonner-toast success rtl"
            });
        } catch (error) {
            toast.error("העריכה נכשלה", {
                className: "sonner-toast error rtl"
            });
        }
    };

    const startEditing = (note) => {
        setInputText(note.text);
        setEditId(note._id);
    };

    const cancelEdit = () => {
        setInputText("");
        setEditId(null);
    };

    const handleCompleted = async (id, completed) => {
        try {
            const response = await api.put(`/notes/${id}`, { completed: !completed });
    
            setNotes(notes.map((n) =>
                n._id === id ? { ...n, completed: !n.completed } : n
            ));
    
            if (completed) {
                toast.info("המשימה חזרה לרשימה 🔄", {
                    className: "sonner-toast info rtl"
                });
            } else {
                toast.success("כל הכבוד! המשימה הושלמה! 🎊", {
                    className: "sonner-toast success rtl"
                });
            }
    
        } catch (e) {
            toast.error("עדכון סטטוס נכשל", {
                className: "sonner-toast error rtl"
            });
        }
    };

    // סטטיסטיקות
    const completedCount = notes.filter(note => note && note.completed).length;
    const pendingCount = notes.filter(note => note && !note.completed).length;
    const completionRate = notes.length > 0 ? Math.round((completedCount / notes.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <ClipLoader size={100} color="#3498db" loading={loading} />
                <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען רשימת משימות . . .</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 py-8">
            <div className="container mx-auto px-4">
                <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-600">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-600">
                        <div className="text-center">
                            <h1 className="text-4xl font-bold text-white">ניהול משימות</h1>
                            <div className="h-1 w-24 bg-orange-500 rounded-full mt-2 mx-auto"></div>
                        </div>
                        
                        {/* סטטיסטיקות */}
                        <div className="flex justify-center gap-8 mt-8">
                            <div className="text-center bg-slate-700 rounded-lg p-4 shadow-sm border border-slate-600">
                                <div className="text-2xl font-bold text-orange-400">{notes.length}</div>
                                <div className="text-slate-300 text-sm">סה״כ משימות</div>
                            </div>
                            <div className="text-center bg-slate-700 rounded-lg p-4 shadow-sm border border-slate-600">
                                <div className="text-2xl font-bold text-green-400">{completedCount}</div>
                                <div className="text-slate-300 text-sm">הושלמו</div>
                            </div>
                            <div className="text-center bg-slate-700 rounded-lg p-4 shadow-sm border border-slate-600">
                                <div className="text-2xl font-bold text-blue-400">{completionRate}%</div>
                                <div className="text-slate-300 text-sm">אחוז השלמה</div>
                            </div>
                        </div>
                    </div>

                    {/* טופס הוספת/עריכת משימה */}
                    <div className="p-6 border-b border-slate-600 bg-slate-750">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-orange-500 rounded-lg">
                                    {editId ? <Edit3 size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                                </div>
                                <h2 className="text-xl font-bold text-white">
                                    {editId ? "עריכת משימה" : "הוספת משימה חדשה"}
                                </h2>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <textarea
                                    placeholder="כתוב כאן את המשימה שלך..."
                                    value={inputText}
                                    onChange={handleTextChange}
                                    className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 p-4 rounded-lg min-h-[120px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none text-lg"
                                    rows="4"
                                />
                                
                                <div className="flex gap-3 justify-center">
                                    <button 
                                        type="submit" 
                                        className="bg-orange-500 text-white px-6 py-2.5 rounded-3xl hover:bg-orange-600 transition-colors duration-200 font-medium flex items-center gap-2"
                                    >
                                        {editId ? <Edit3 size={18} /> : <Plus size={18} />}
                                        {editId ? "עדכן משימה" : "הוסף משימה"}
                                    </button>
                                    
                                    {editId && (
                                        <button 
                                            type="button"
                                            onClick={cancelEdit}
                                            className="bg-slate-600 text-slate-300 px-6 py-2.5 rounded-3xl hover:bg-slate-500 hover:text-white transition-colors duration-200 font-medium flex items-center gap-2"
                                        >
                                            <X size={18} />
                                            ביטול
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* רשימת המשימות */}
                    <div className="p-6">
                        {notes?.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-white">רשימת המשימות</h2>
                                    <div className="flex gap-3 text-sm">
                                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-medium">
                                            {pendingCount} ממתינות
                                        </span>
                                        <span className="bg-green-500 text-white px-3 py-1 rounded-full font-medium">
                                            {completedCount} הושלמו
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {notes.filter(note => note && note._id).map((note, index) => (
                                        <div 
                                            key={note._id} 
                                            className={`bg-slate-700 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                                note.completed 
                                                    ? 'border-green-500 bg-slate-600' 
                                                    : 'border-slate-600 hover:border-orange-500'
                                            }`}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-4">
                                                    {/* מספר המשימה ו/או סטטוס */}
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                                        note.completed 
                                                            ? 'bg-green-500' 
                                                            : 'bg-orange-500'
                                                    }`}>
                                                        {note.completed ? <CheckCircle2 size={16} /> : index + 1}
                                                    </div>
                                                    
                                                    <div className="flex-1">
                                                        {/* תוכן המשימה */}
                                                        <div className={`text-lg leading-relaxed mb-3 ${
                                                            note.completed 
                                                                ? 'text-slate-400 line-through' 
                                                                : 'text-white'
                                                        }`}>
                                                            {note.text}
                                                        </div>
                                                        
                                                        {/* תאריך יצירה */}
                                                        {note.createdAt && (
                                                            <div className="text-sm text-slate-400 mb-3">
                                                                נוצר ב-{new Date(note.createdAt).toLocaleDateString('he-IL')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* כפתורי פעולה */}
                                                <div className="flex gap-2 pt-3 border-t border-slate-600">
                                                    <button
                                                        onClick={() => handleCompleted(note._id, note.completed)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors duration-150 text-sm ${
                                                            note.completed
                                                                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                                                                : "bg-green-600 text-white hover:bg-green-700"
                                                        }`}
                                                    >
                                                        {note.completed ? (
                                                            <>
                                                                <Circle size={16} />
                                                                בטל השלמה
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check size={16} />
                                                                סמן כהושלם
                                                            </>
                                                        )}
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => startEditing(note)}
                                                        className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg font-medium transition-colors duration-150 text-sm flex items-center gap-2"
                                                    >
                                                        <Edit3 size={16} />
                                                        ערוך
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleDelete(note._id)}
                                                        className="bg-red-600 text-white hover:bg-red-700 px-3 py-2 rounded-lg font-medium transition-colors duration-150 text-sm flex items-center gap-2"
                                                    >
                                                        <Trash2 size={16} />
                                                        מחק
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-600">
                                    <FileText className="w-12 h-12 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-300 mb-3">אין עדיין משימות</h3>
                                <p className="text-lg text-slate-400 mb-6">
                                    הוסף את המשימה הראשונה שלך כדי להתחיל
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notes;