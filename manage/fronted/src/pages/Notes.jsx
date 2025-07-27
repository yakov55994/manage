import React, { useEffect, useState } from "react";
import api from '../api/api.jsx';
import { ClipLoader } from "react-spinners";
import imgCompletedTrue from '../images/completedTrue.png';
import imgCompletedFalse from '../images/completedFalse.png';
import { toast } from "sonner";

const NewPage = () => {
    const [inputText, setInputText] = useState("");
    const [notes, setNotes] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null); // שמירת ID של הערה שנערכת


    const handleChange = (event) => {
        setInputText(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (editId) {
            // אם יש ID - מעדכנים במקום להוסיף חדשה
            handleEdit(editId);
        } else {   
            try {
                const response = await api.post('/notes', { text: inputText });
                setNotes([...notes, response.data.note]);
                toast.success("המשימה נוצרה בהצלחה",{
                    className: "sonner-toast success rtl"
                });
                setInputText("");
                // fetchNotes();
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

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleDelete = async (id) => {
        try {
            await api.delete(`/notes/${id}`);
            setNotes(notes.filter((n) => n._id !== id));
            toast.success("המשימה נמחקה בהצלחה תודה רבה", {
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
            await api.put(`/notes/${id}`, { text: inputText });
            setNotes(notes.map((n) => (n._id === id ? { ...n, text: inputText } : n)));
            setInputText("");
            setEditId(null); // לאחר העדכון, מסיימים את מצב העריכה
            toast.success("העריכה בוצעה בהצלחה", {
                className: "sonner-toast success rtl"
            })
        } catch (error) {
            toast.error("העריכה נכשלה", {
                className: "sonner-toast success rtl"
            });
        }
    };

    const startEditing = (note) => {
        setInputText(note.text); // מכניס את הטקסט לאינפוט
        setEditId(note._id); // שומר את ה-ID של ההערה שנערכת
    };

    const handlecompleted = async (id, completed) => {
        try {
            // שליחת בקשה לשרת לעדכון הסטטוס
            const response = await api.put(`/notes/${id}`, { completed: !completed });
    
            // עדכון המצב בצד הלקוח עם הסטטוס החדש
            setNotes(notes.map((n) =>
                n._id === id ? { ...n, completed: !n.completed } : n
            ));
    
            // שליחת טוסט בהתאם לערך החדש של completed
            if (completed) {
                // אם completed היה true (המשימה בוצעה), אז טוסט של "המשימה לא בוצעה"
                toast.error("המשימה לא בוצעה", {
                    className: "sonner-toast error rtl"
                });
            } else {
                // אם completed היה false (המשימה לא בוצעה), אז טוסט של "המשימה בוצעה בהצלחה"
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
            <div className="p-6 max-w-md mx-auto bg-slate-300 shadow-md rounded-lg mt-10">
                <h1 className="text-2xl font-bold mb-4  text-center">משימה לביצוע כותבים כאן :</h1>
                <form onSubmit={handleSubmit}>
                    <textarea
                        type="text"
                        placeholder="משימה להלן:"
                        value={inputText}
                        onChange={handleChange}
                        className="border-2  border-gray-900 p-3 rounded-lg w-full min-h-[100px] h-32 mt-6 px-3 py-2.5"
                    />
                    <div className="grid place-items-center ">
                        <button type="submit" className=" mt-3 w-auto font-bold text-center  bg-slate-400 p-3 rounded-md hover:bg-slate-800 hover:text-white">
                            {editId ? "עדכן" : "הוסף משימה לרשימה"}
                        </button>
                    </div>
                </form>
                {message && <p className="mt-4 text-green-800 font-bold text-xl text-center">{message}</p>}
            </div>


            {/* <div className="flex flex-row gap-10 justify-center items-center mt-10 space-y-10">
                <div className="text-center mt-10">
                    <h1 className="font-bold text-xl mb-4">אם המשימה הושלמה זה יראה ככה:</h1>
                    <img src={imgCompletedTrue} alt="Completed" className="h-24 w-56" />
                </div>
                <div className="text-center">
                    <h1 className="font-bold text-xl mb-4">אם המשימה לא הושלמה זה יראה ככה:</h1>
                    <img src={imgCompletedFalse} alt="Not Completed" className="h-24 w-56" />
                </div>
            </div> */}



            <h1 className="text-center font-bold text-slate-800 mt-14 text-4xl">משימות לביצוע :</h1>
            {notes?.length > 0 ? (
                notes.map((note, index) => (
                    <div key={note._id} className="p-4 border-b-4 border-slate-700">
                        <span className="text-lg font-bold text-gray-600">{index + 1}.</span>
                        <h2 className="text-l font-bold text-orange-800 mt-2">{note.text}</h2>
                        <button
                            onClick={() => handleDelete(note._id)}
                            className="bg-red-500 font-bold w-12 text-white p-1 rounded-md mt-3"
                        >
                            מחק
                        </button>
                        <button
                            onClick={() => startEditing(note)}
                            className="bg-slate-900 font-bold text-white p-1 rounded-md mt-3 mr-3 w-12"
                        >
                            ערוך
                        </button>
                        <button
                            onClick={() => handlecompleted(note._id, note.completed)}
                            className={`p-2 rounded-full border-2 mr-5 font-bold transition-all
        ${note.completed
                                    ? "border-green-600 text-black bg-green-400 font-bold"  // רקע ירוק כאשר הושלם
                                    : "border-gray-400 text-gray-500 bg-transparent" // רקע שקוף כאשר לא הושלם
                                }`}
                        >
                            ✔ הושלם
                        </button>



                    </div>
                ))
            ) : (
                <h1 className="text-center font-bold text-red-800 mt-10 text-4xl">אין משימות</h1>
            )}
        </>
    );
};

export default NewPage;



