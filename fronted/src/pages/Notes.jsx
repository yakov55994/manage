import React, { useEffect, useState } from "react";
import api from '../api/api.jsx';
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const NewPage = () => {
    const [inputText, setInputText] = useState("");
    const [notes, setNotes] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    
    // מערכת התחברות עם Modal
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [currentUser, setCurrentUser] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    // רשימת משתמשים וסיסמאות
    const users = {
        "1234": "יעקב",
        "2345": "חזקי", 
        "3456": "דנה"
    };

    // בדיקת אימות בטעינה
    useEffect(() => {
        const savedUser = localStorage.getItem('auth_user');
        const authToken = localStorage.getItem('auth_token');
        
        if (savedUser && authToken) {
            setCurrentUser(savedUser);
            setShowAuthModal(false);
        } else {
            setShowAuthModal(true);
        }
        
        fetchNotes();
    }, []);

    // התחברות
    const handleAuth = async (e) => {
        e.preventDefault();
        
        if (users[passwordInput]) {
            const userName = users[passwordInput];
            
            // שמירת פרטי האימות
            sessionStorage.setItem('auth_user', userName);
            localStorage.setItem('auth_token', `token_${passwordInput}_${Date.now()}`);
            
            setCurrentUser(userName);
            setShowAuthModal(false);
            setPasswordInput("");
            
            toast.success(`שלום ${userName}! התחברת בהצלחה`, {
                className: "sonner-toast success rtl"
            });
        } else {
            toast.error("סיסמה שגויה", {
                className: "sonner-toast error rtl"
            });
        }
    };

    // התנתקות
    const handleLogout = () => {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        setCurrentUser("");
        setShowAuthModal(true);
        toast.success("התנתקת בהצלחה", {
            className: "sonner-toast success rtl"
        });
    };

    // פונקציה לצבע לכל משתמש
    const getUserColor = (userName) => {
        const colors = {
            "יעקב": "text-blue-600 bg-blue-100",
            "חזקי": "text-green-600 bg-green-100", 
            "דנה": "text-purple-600 bg-purple-100"
        };
        return colors[userName] || "text-gray-600 bg-gray-100";
    };

    const handleTextChange = (event) => {
        setInputText(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!inputText.trim()) {
            toast.error("אנא כתב משימה", {
                className: "sonner-toast error rtl"
            });
            return;
        }

        if (editId) {
            handleEdit(editId);
        } else {   
            try {
                console.log(inputText, currentUser);
                const response = await api.post('/notes', { 
                    text: inputText,
                    userName: currentUser 
                });
                setNotes([...notes, response.data.note]);
                toast.success("המשימה נוצרה בהצלחה", {
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
            toast.success("המשימה נמחקה בהצלחה", {
                className: "sonner-toast success rtl"
            })
        } catch (error) {
            toast.error("המחיקה נכשלה", {
                className: "sonner-toast error rtl"
            });
        }
    };

    const handleEdit = async (id) => {
        try {
            await api.put(`/notes/${id}`, { 
                text: inputText,
                userName: currentUser 
            });
            setNotes(notes.map((n) => (n._id === id ? { ...n, text: inputText, userName: currentUser } : n)));
            setInputText("");
            setEditId(null);
            toast.success("העריכה בוצעה בהצלחה", {
                className: "sonner-toast success rtl"
            })
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

    const handlecompleted = async (id, completed) => {
        try {
            const response = await api.put(`/notes/${id}`, { completed: !completed });
    
            setNotes(notes.map((n) =>
                n._id === id ? { ...n, completed: !n.completed } : n
            ));
    
            if (completed) {
                toast.error("המשימה לא בוצעה", {
                    className: "sonner-toast error rtl"
                });
            } else {
                toast.success("המשימה בוצעה בהצלחה!", {
                    className: "sonner-toast success rtl"
                });
            }
    
        } catch (e) {
            toast.error("עדכון סטטוס נכשל", {
                className: "sonner-toast error rtl"
            });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64">
                <ClipLoader size={100} color="#3498db" loading={loading} />
                <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען . . .</h1>
            </div>
        );
    }

    return (
        <>
            {/* Modal אימות */}
            {showAuthModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Logo */}
                        <div className="flex justify-center pt-8 pb-4">
                            <div className="w-16 h-16 bg-blue-500 rounded-2xl shadow-xl flex items-center justify-center">
                                <KeyRound className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        {/* Header */}
                        <div className="px-8 pb-8">
                            <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
                                ברוכים הבאים
                            </h2>
                            <p className="text-center text-gray-500 text-sm font-bold">
                                הזן את קוד הגישה שלך להתחברות למערכת
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleAuth} className="px-8 pb-8">
                            <div className="relative mb-6">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="קוד גישה" 
                                    value={passwordInput} 
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 transition-all duration-300 outline-none text-right pl-12 font-bold"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold transition-all duration-300 hover:bg-blue-600 focus:ring-4 focus:ring-blue-200"
                            >
                                התחבר למערכת
                            </button>
                        </form>

                        {/* רמז */}
                        <div className="bg-gray-50 px-8 py-6 border-t border-gray-100">
                            <p className="text-xs text-gray-500 text-center">
                                משתמשים: 1234 - יעקב | 2345 - חזקי | 3456 - דנה
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* תוכן האפליקציה */}
            {currentUser && (
                <>
                    {/* כותרת עם שם המשתמש */}
                    <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold">שלום {currentUser}! 👋</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                        >
                            התנתק
                        </button>
                    </div>

                    <div className="p-6 max-w-md mx-auto bg-slate-300 shadow-md rounded-lg mt-10">
                        <h1 className="text-2xl font-bold mb-4 text-center">משימה לביצוע כותבים כאן :</h1>
                        <form onSubmit={handleSubmit}>
                            <textarea
                                type="text"
                                placeholder="משימה להלן:"
                                value={inputText}
                                onChange={handleTextChange}
                                className="border-2 border-gray-900 p-3 rounded-lg w-full min-h-[100px] h-32 px-3 py-2.5"
                            />
                            <div className="grid place-items-center">
                                <button type="submit" className="mt-3 w-auto font-bold text-center bg-slate-400 p-3 rounded-md hover:bg-slate-800 hover:text-white">
                                    {editId ? "עדכן" : "הוסף משימה לרשימה"}
                                </button>
                            </div>
                        </form>
                        {message && <p className="mt-4 text-green-800 font-bold text-xl text-center">{message}</p>}
                    </div>

                    <h1 className="text-center font-bold text-slate-800 mt-14 text-4xl">משימות לביצוע :</h1>
                    {notes?.length > 0 ? (
                        notes.map((note, index) => (
                            <div key={note._id} className="p-4 border-b-4 border-slate-700">
                                <span className="text-lg font-bold text-gray-600">{index + 1}.</span>
                                
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-sm font-bold px-2 py-1 rounded ${getUserColor(note.userName)}`}>
                                        👤 {note.userName || "לא צוין שם"}
                                    </span>
                                </div>
                                
                                <h2 className="text-l font-bold text-orange-800 mt-2">{note.text}</h2>
                                
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleDelete(note._id)}
                                        className="bg-red-500 font-bold w-12 text-white p-1 rounded-md"
                                    >
                                        מחק
                                    </button>
                                    <button
                                        onClick={() => startEditing(note)}
                                        className="bg-slate-900 font-bold text-white p-1 rounded-md w-12"
                                    >
                                        ערוך
                                    </button>
                                    <button
                                        onClick={() => handlecompleted(note._id, note.completed)}
                                        className={`p-2 rounded-full border-2 font-bold transition-all
                                            ${note.completed
                                                ? "border-green-600 text-black bg-green-400"
                                                : "border-gray-400 text-gray-500 bg-transparent"
                                            }`}
                                    >
                                        ✔ הושלם
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <h1 className="text-center font-bold text-red-800 mt-10 text-4xl">אין משימות</h1>
                    )}
                </>
            )}
        </>
    );
};

export default NewPage;