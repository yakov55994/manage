import React, { useEffect, useState, useRef } from "react";
import api from '../api/api.js';
import { ClipLoader } from "react-spinners";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Plus, Edit3, Trash2, Check, X, CheckCircle2, Circle,
  Target, FileText, User, Paperclip, Send, MessageCircle,
  ChevronDown, ChevronUp, Image, Video, File, ExternalLink
} from "lucide-react";

const Notes = () => {
  const { user, isAdmin } = useAuth();
  const [inputText, setInputText] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);

  // קבצים מצורפים ליצירת משימה
  const [noteFile, setNoteFile] = useState(null);
  const noteFileRef = useRef();

  // מצב פתיחת צ'אט לכל משימה
  const [expandedNotes, setExpandedNotes] = useState({});

  // תגובות
  const [commentInputs, setCommentInputs] = useState({});
  const [commentFiles, setCommentFiles] = useState({});
  const commentFileRefs = useRef({});

  // loading states
  const [uploadingAttachment, setUploadingAttachment] = useState(null); // noteId
  const [deletingAttachment, setDeletingAttachment] = useState(null);
  const [sendingComment, setSendingComment] = useState(null); // noteId
  const [deletingComment, setDeletingComment] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      const validNotes = res.data.filter(note => note && typeof note === 'object' && note._id);
      setNotes(validNotes);
    } catch (error) {
      toast.error("שגיאה בשליפת המשימות", { className: "sonner-toast error rtl" });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!inputText.trim()) {
      toast.error("אנא כתוב משימה", { className: "sonner-toast error rtl" });
      return;
    }
    if (editId) {
      handleEdit(editId);
      return;
    }
    try {
      const response = await api.post('/notes', { text: inputText });
      const newNote = response.data.note || response.data;
      if (!newNote?._id) throw new Error("תגובה לא תקינה מהשרת");

      // אם נבחר קובץ - העלה אותו
      if (noteFile) {
        const formData = new FormData();
        formData.append('file', noteFile);
        try {
          const attRes = await api.post(`/notes/${newNote._id}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          newNote.attachments = attRes.data.note?.attachments || [];
        } catch { /* המשימה נוצרה, הקובץ לא עלה */ }
        setNoteFile(null);
        if (noteFileRef.current) noteFileRef.current.value = '';
      }

      setNotes(prev => [...prev, newNote]);
      toast.success("המשימה נוצרה בהצלחה!", { className: "sonner-toast success rtl" });
      setInputText("");
    } catch (error) {
      toast.error("הייתה שגיאה בשליחת הנתונים", { className: "sonner-toast error rtl" });
    }
  };

  const handleEdit = async (id) => {
    try {
      await api.put(`/notes/${id}`, { text: inputText });
      setNotes(notes.map(n => n._id === id ? { ...n, text: inputText } : n));
      setInputText("");
      setEditId(null);
      toast.success("העריכה בוצעה בהצלחה!", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("העריכה נכשלה", { className: "sonner-toast error rtl" });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter(n => n._id !== id));
      toast.success("המשימה נמחקה בהצלחה!", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("המחיקה נכשלה", { className: "sonner-toast error rtl" });
    }
  };

  const handleCompleted = async (id, completed) => {
    try {
      await api.put(`/notes/${id}`, { completed: !completed });
      setNotes(notes.map(n => n._id === id ? { ...n, completed: !n.completed } : n));
      toast.success(completed ? "המשימה חזרה לרשימה 🔄" : "כל הכבוד! המשימה הושלמה! 🎊", {
        className: "sonner-toast success rtl"
      });
    } catch {
      toast.error("עדכון סטטוס נכשל", { className: "sonner-toast error rtl" });
    }
  };

  const startEditing = (note) => {
    setInputText(note.text);
    setEditId(note._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setInputText("");
    setEditId(null);
    setNoteFile(null);
    if (noteFileRef.current) noteFileRef.current.value = '';
  };

  // ===== קבצים מצורפים למשימה =====
  const handleAddAttachment = async (noteId, file) => {
    if (!file) return;
    setUploadingAttachment(noteId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(`/notes/${noteId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNotes(prev => prev.map(n => n._id === noteId ? { ...n, attachments: res.data.note.attachments } : n));
      toast.success("הקובץ הועלה בהצלחה", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("שגיאה בהעלאת הקובץ", { className: "sonner-toast error rtl" });
    } finally {
      setUploadingAttachment(null);
    }
  };

  const handleDeleteAttachment = async (noteId, attId) => {
    setDeletingAttachment(attId);
    try {
      await api.delete(`/notes/${noteId}/attachments/${attId}`);
      setNotes(prev => prev.map(n =>
        n._id === noteId ? { ...n, attachments: n.attachments.filter(a => a._id !== attId) } : n
      ));
      toast.success("הקובץ נמחק", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("שגיאה במחיקת הקובץ", { className: "sonner-toast error rtl" });
    } finally {
      setDeletingAttachment(null);
    }
  };

  // ===== תגובות =====
  const handleSendComment = async (noteId) => {
    const text = commentInputs[noteId] || "";
    const file = commentFiles[noteId];
    if (!text.trim() && !file) {
      toast.error("כתוב תגובה או צרף קובץ", { className: "sonner-toast error rtl" });
      return;
    }
    setSendingComment(noteId);
    try {
      const formData = new FormData();
      formData.append('text', text);
      if (file) formData.append('file', file);

      const res = await api.post(`/notes/${noteId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNotes(prev => prev.map(n => n._id === noteId ? { ...n, comments: res.data.note.comments } : n));
      setCommentInputs(prev => ({ ...prev, [noteId]: "" }));
      setCommentFiles(prev => ({ ...prev, [noteId]: null }));
      if (commentFileRefs.current[noteId]) commentFileRefs.current[noteId].value = '';
      toast.success("תגובה נשלחה", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("שגיאה בשליחת תגובה", { className: "sonner-toast error rtl" });
    } finally {
      setSendingComment(null);
    }
  };

  const handleDeleteComment = async (noteId, commentId) => {
    setDeletingComment(commentId);
    try {
      await api.delete(`/notes/${noteId}/comments/${commentId}`);
      setNotes(prev => prev.map(n =>
        n._id === noteId ? { ...n, comments: n.comments.filter(c => c._id !== commentId) } : n
      ));
      toast.success("תגובה נמחקה", { className: "sonner-toast success rtl" });
    } catch {
      toast.error("שגיאה במחיקת תגובה", { className: "sonner-toast error rtl" });
    } finally {
      setDeletingComment(null);
    }
  };

  const toggleExpand = (noteId) => {
    setExpandedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const isImage = (type) => type?.startsWith('image/');
  const isVideo = (type) => type?.startsWith('video/');

  const AttachmentPreview = ({ att, onDelete, canDelete }) => (
    <div className="relative group inline-block">
      {isImage(att.type) ? (
        <a href={att.url} target="_blank" rel="noreferrer">
          <img
            src={att.url}
            alt={att.name}
            className="w-16 h-16 object-cover rounded-lg border border-slate-600 hover:opacity-80 transition-opacity cursor-pointer"
          />
        </a>
      ) : isVideo(att.type) ? (
        <a href={att.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-16 h-16 bg-slate-700 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
          <Video className="w-6 h-6 text-blue-400" />
          <span className="text-xs text-slate-400 mt-1 truncate w-14 text-center">וידאו</span>
        </a>
      ) : (
        <a href={att.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-16 h-16 bg-slate-700 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
          <File className="w-6 h-6 text-orange-400" />
          <span className="text-xs text-slate-400 mt-1 truncate w-14 text-center">{att.name?.split('.').pop()}</span>
        </a>
      )}
      {canDelete && (
        <button
          onClick={onDelete}
          disabled={deletingAttachment === att._id}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );

  const completedCount = notes.filter(n => n?.completed).length;
  const pendingCount = notes.filter(n => n && !n.completed).length;
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
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-600">

          {/* Header */}
          <div className="p-4 sm:p-6 md:p-8 border-b border-slate-600">
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">ניהול משימות</h1>
              <div className="h-1 w-24 bg-orange-500 rounded-full mt-2 mx-auto"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-6">
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

          {/* טופס יצירת משימה - רק Admin */}
          {isAdmin && (
            <div className="p-4 sm:p-6 border-b border-slate-600">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500 rounded-lg">
                  {editId ? <Edit3 size={20} className="text-white" /> : <Plus size={20} className="text-white" />}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editId ? "עריכת משימה" : "הוספת משימה חדשה"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="תאר את המשימה..."
                  rows={3}
                  className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 resize-none"
                />

                {/* העלאת קובץ */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg border border-slate-600 transition-colors text-sm">
                    <Paperclip className="w-4 h-4" />
                    {noteFile ? noteFile.name : "צרף קובץ (אופציונלי)"}
                    <input
                      ref={noteFileRef}
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={e => setNoteFile(e.target.files[0] || null)}
                    />
                  </label>
                  {noteFile && (
                    <button type="button" onClick={() => { setNoteFile(null); if (noteFileRef.current) noteFileRef.current.value = ''; }} className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors">
                    {editId ? <Check size={18} /> : <Plus size={18} />}
                    {editId ? "עדכן" : "הוסף משימה"}
                  </button>
                  {editId && (
                    <button type="button" onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                      <X size={18} /> ביטול
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* רשימת משימות */}
          <div className="p-4 sm:p-6 space-y-4">
            {notes.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>אין משימות עדיין</p>
              </div>
            )}

            {notes.map(note => (
              <div key={note._id} className={`rounded-lg border transition-all ${
                note.completed ? 'border-green-800/50 bg-slate-900/50' : 'border-slate-600 bg-slate-700/50'
              }`}>
                {/* כותרת המשימה */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* כפתור השלמה */}
                    <button
                      onClick={() => handleCompleted(note._id, note.completed)}
                      className="mt-0.5 flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {note.completed
                        ? <CheckCircle2 className="w-6 h-6 text-green-400" />
                        : <Circle className="w-6 h-6 text-slate-400" />}
                    </button>

                    {/* טקסט */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-medium leading-relaxed ${
                        note.completed ? 'line-through text-slate-500' : 'text-white'
                      }`}>
                        {note.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        <span>{note.createdByName || 'לא ידוע'}</span>
                        {note.createdAt && (
                          <span>· {new Date(note.createdAt).toLocaleDateString('he-IL')}</span>
                        )}
                      </div>
                    </div>

                    {/* כפתורי admin */}
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                          title="עריכה"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(note._id)}
                          className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* קבצים מצורפים למשימה */}
                  {((note.attachments?.length > 0) || isAdmin) && (
                    <div className="mt-3 mr-9">
                      <div className="flex flex-wrap gap-2 items-center">
                        {note.attachments?.map(att => (
                          <AttachmentPreview
                            key={att._id}
                            att={att}
                            canDelete={isAdmin}
                            onDelete={() => handleDeleteAttachment(note._id, att._id)}
                          />
                        ))}
                        {isAdmin && (
                          <label className={`flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-lg border border-dashed border-slate-500 cursor-pointer transition-colors text-sm ${uploadingAttachment === note._id ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploadingAttachment === note._id ? (
                              <ClipLoader size={14} color="#f97316" />
                            ) : (
                              <Paperclip className="w-3.5 h-3.5" />
                            )}
                            <span>הוסף קובץ</span>
                            <input
                              type="file"
                              accept="image/*,video/*,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files[0];
                                if (f) { handleAddAttachment(note._id, f); e.target.value = ''; }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* כפתור פתיחת צ'אט */}
                  <button
                    onClick={() => toggleExpand(note._id)}
                    className="flex items-center gap-2 mt-3 mr-9 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {note.comments?.length > 0 ? `${note.comments.length} תגובות` : 'תגובות'}
                    </span>
                    {expandedNotes[note._id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* אזור הצ'אט */}
                {expandedNotes[note._id] && (
                  <div className="border-t border-slate-600 bg-slate-800/80 rounded-b-lg">

                    {/* תגובות קיימות */}
                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                      {(!note.comments || note.comments.length === 0) && (
                        <p className="text-slate-500 text-sm text-center py-2">אין תגובות עדיין. היה הראשון!</p>
                      )}
                      {note.comments?.map(comment => {
                        const isMe = comment.createdBy === user?._id || comment.createdByName === user?.username;
                        const canDeleteComment = isAdmin || comment.createdBy === user?._id;
                        return (
                          <div key={comment._id} className={`flex ${isMe ? 'justify-start' : 'justify-start'} gap-2`}>
                            <div className="flex-1 min-w-0">
                              <div className={`inline-block max-w-full rounded-xl px-4 py-2.5 ${
                                isMe ? 'bg-orange-600/30 border border-orange-700/40' : 'bg-slate-700 border border-slate-600'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-orange-400">{comment.createdByName}</span>
                                  <span className="text-xs text-slate-500">
                                    {comment.createdAt ? new Date(comment.createdAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                  {canDeleteComment && (
                                    <button
                                      onClick={() => handleDeleteComment(note._id, comment._id)}
                                      disabled={deletingComment === comment._id}
                                      className="mr-auto p-0.5 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {comment.text && (
                                  <p className="text-slate-200 text-sm leading-relaxed">{comment.text}</p>
                                )}
                                {comment.attachments?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {comment.attachments.map(att => (
                                      <AttachmentPreview key={att._id} att={att} canDelete={false} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* שליחת תגובה */}
                    <div className="p-3 border-t border-slate-700">
                      {/* קובץ שנבחר */}
                      {commentFiles[note._id] && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-slate-700 rounded-lg">
                          <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-sm text-slate-300 flex-1 truncate">{commentFiles[note._id].name}</span>
                          <button onClick={() => {
                            setCommentFiles(prev => ({ ...prev, [note._id]: null }));
                            if (commentFileRefs.current[note._id]) commentFileRefs.current[note._id].value = '';
                          }} className="text-slate-500 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <input
                          type="text"
                          value={commentInputs[note._id] || ""}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [note._id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(note._id); } }}
                          placeholder="כתוב תגובה... (Enter לשליחה)"
                          className="flex-1 bg-slate-700 text-white placeholder-slate-500 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        />
                        {/* צרף קובץ לתגובה */}
                        <label className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-orange-400 rounded-lg cursor-pointer transition-colors border border-slate-600" title="צרף קובץ">
                          <Paperclip className="w-4 h-4" />
                          <input
                            ref={el => commentFileRefs.current[note._id] = el}
                            type="file"
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files[0];
                              if (f) setCommentFiles(prev => ({ ...prev, [note._id]: f }));
                            }}
                          />
                        </label>
                        {/* שלח */}
                        <button
                          onClick={() => handleSendComment(note._id)}
                          disabled={sendingComment === note._id}
                          className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          title="שלח"
                        >
                          {sendingComment === note._id
                            ? <ClipLoader size={16} color="white" />
                            : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Notes;
