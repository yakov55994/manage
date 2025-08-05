import React, { useEffect, useState } from "react";
import api from '../api/api.jsx';
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Check, X, CheckCircle2, Circle, Sparkles, Target, Zap } from "lucide-react";

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
                setNotes([...notes, response.data.note]);
                toast.success("המשימה נוצרה בהצלחה! 🎉", {
                    className: "sonner-toast success rtl"
                });
                setInputText("");
            } catch (error) {
                console.error("Error sending data", error);
                toast.error("הייתה שגיאה בשליחת הנתונים", {
                    className: "sonner-toast error rtl"
                });
            }
        }
    };

    const fetchNotes = async () => {
        try {
            const res = await api.get('/notes');
            setNotes(res.data);
        } catch (error) {
            toast.error("שגיאה בשליפת המשימות", {
                className: "sonner-toast error rtl"
            });
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
    const completedCount = notes.filter(note => note.completed).length;
    const pendingCount = notes.filter(note => !note.completed).length;
    const completionRate = notes.length > 0 ? Math.round((completedCount / notes.length) * 100) : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 flex flex-col justify-center items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <ClipLoader size={80} color="#6366f1" loading={loading} />
                </div>
                <h1 className="mt-8 font-bold text-2xl bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                    טוען את המשימות שלך...
                </h1>
                <div className="flex gap-2 mt-4">
                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
            {/* Header מדהים */}
            <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                
                <div className="relative px-6 py-16 text-center text-white">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                                <Target className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-yellow-800" />
                            </div>
                        </div>
                    </div>
                    
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                        ניהול משימות חכם
                    </h1>
                    <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto">
                        הפוך את היום שלך לפרודוקטיבי יותר עם מערכת ניהול המשימות המתקדמת
                    </p>
                    
                    {/* סטטיסטיקות */}
                    <div className="flex justify-center gap-8 mt-8">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-white">{notes.length}</div>
                            <div className="text-blue-200 text-sm">סה״כ משימות</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-300">{completedCount}</div>
                            <div className="text-blue-200 text-sm">הושלמו</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-300">{completionRate}%</div>
                            <div className="text-blue-200 text-sm">אחוז השלמה</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                {/* טופס הוספת/עריכת משימה */}
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-200 to-blue-200 rounded-3xl blur-xl opacity-50"></div>
                    <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                editId 
                                    ? 'bg-gradient-to-r from-orange-400 to-pink-400' 
                                    : 'bg-gradient-to-r from-violet-400 to-blue-400'
                            }`}>
                                {editId ? <Edit3 className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                {editId ? "עריכת משימה" : "הוספת משימה חדשה"}
                            </h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <textarea
                                    placeholder="כתוב כאן את המשימה שלך... 🎯"
                                    value={inputText}
                                    onChange={handleTextChange}
                                    className="w-full border-0 bg-white/80 backdrop-blur-sm p-6 rounded-2xl min-h-[140px] focus:ring-4 focus:ring-violet-200 focus:bg-white transition-all duration-300 resize-none text-lg placeholder:text-gray-400 shadow-lg"
                                    rows="4"
                                />
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-sm text-gray-400">
                                    <Zap className="w-4 h-4" />
                                    <span>{inputText.length} תווים</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 justify-center">
                                <button 
                                    type="submit" 
                                    className="group bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3"
                                >
                                    {editId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {editId ? "עדכן משימה" : "הוסף משימה"}
                                    <div className="w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>
                                
                                {editId && (
                                    <button 
                                        type="button"
                                        onClick={cancelEdit}
                                        className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3"
                                    >
                                        <X className="w-5 h-5" />
                                        ביטול
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* רשימת המשימות */}
                {notes?.length > 0 ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                המשימות שלך
                            </h2>
                            <div className="flex gap-4 text-sm">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                    {pendingCount} ממתינות
                                </span>
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                                    {completedCount} הושלמו
                                </span>
                            </div>
                        </div>
                        
                        <div className="grid gap-4">
                            {notes.map((note, index) => (
                                <div 
                                    key={note._id} 
                                    className={`group relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1 ${
                                        note.completed 
                                            ? 'border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/50' 
                                            : 'border-violet-200 bg-gradient-to-r from-violet-50/50 to-blue-50/50'
                                    }`}
                                >
                                    {/* פס צבעוני */}
                                    <div className={`absolute top-0 left-0 w-full h-1 rounded-t-2xl ${
                                        note.completed 
                                            ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                                            : 'bg-gradient-to-r from-violet-400 to-blue-400'
                                    }`}></div>
                                    
                                    <div className="flex items-start gap-4">
                                        {/* מספר המשימה */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                                            note.completed 
                                                ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                                                : 'bg-gradient-to-r from-violet-400 to-blue-400'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        
                                        <div className="flex-1">
                                            {/* סטטוס */}
                                            {note.completed && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                                                        הושלם ✨
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* תוכן המשימה */}
                                            <div className={`text-lg leading-relaxed mb-4 ${
                                                note.completed 
                                                    ? 'text-gray-500 line-through' 
                                                    : 'text-gray-800 font-medium'
                                            }`}>
                                                {note.text}
                                            </div>
                                            
                                            {/* תאריך יצירה */}
                                            {note.createdAt && (
                                                <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                    נוצר ב-{new Date(note.createdAt).toLocaleDateString('he-IL')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* כפתורי פעולה */}
                                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={() => handleCompleted(note._id, note.completed)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 ${
                                                note.completed
                                                    ? "bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg"
                                                    : "bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg"
                                            }`}
                                        >
                                            {note.completed ? (
                                                <>
                                                    <Circle className="w-4 h-4" />
                                                    בטל השלמה
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    סמן כהושלם
                                                </>
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={() => startEditing(note)}
                                            className="bg-gradient-to-r from-blue-400 to-indigo-400 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            ערוך
                                        </button>
                                        
                                        <button
                                            onClick={() => handleDelete(note._id)}
                                            className="bg-gradient-to-r from-red-400 to-pink-400 hover:from-red-500 hover:to-pink-500 text-white px-4 py-2 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            מחק
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 bg-gradient-to-r from-violet-100 to-blue-100 rounded-full flex items-center justify-center mx-auto">
                                <Target className="w-16 h-16 text-violet-400" />
                            </div>
                            <div className="absolute -top-2 -right-8 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-yellow-800" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-700 mb-4">מוכן להתחיל?</h3>
                        <p className="text-xl text-gray-500 mb-8 max-w-md mx-auto">
                            הוסף את המשימה הראשונה שלך והתחל להיות יותר פרודוקטיבי!
                        </p>
                        <div className="flex items-center justify-center gap-2 text-violet-400">
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notes;