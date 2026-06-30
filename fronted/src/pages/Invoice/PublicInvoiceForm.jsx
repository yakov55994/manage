import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { CheckCircle, Upload, FileText, Building2, CreditCard, AlertCircle, X, Search, Briefcase } from "lucide-react";

const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://management-server-owna.onrender.com/api";

const DOCUMENT_TYPES = [
  "ח. עסקה",
  "ה. עבודה",
  "ד. תשלום",
  "חשבונית מס / קבלה",
];

const initialForm = {
  supplierName: "",
  supplierTaxId: "",
  supplierAddress: "",
  supplierPhone: "",
  supplierEmail: "",
  bankName: "",
  bankBranch: "",
  bankAccount: "",
  invoiceNumber: "",
  invoiceDate: "",
  totalAmount: "",
  documentType: "",
  detail: "",
};

export default function PublicInvoiceForm() {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  // בחירת פרויקט
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectRef = useRef(null);

  useEffect(() => {
    axios.get(`${BASE_URL}/pending-invoices/projects`)
      .then((r) => setProjects(r.data))
      .catch(() => {});
  }, []);

  // סגירת dropdown פרויקט בלחיצה מחוץ
  useEffect(() => {
    const handler = (e) => {
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setProjectOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > 10 * 1024 * 1024) {
      setError("גודל הקובץ חייב להיות עד 10MB");
      return;
    }
    setFile(selected || null);
    setError("");
  };

  const validate = () => {
    const required = ["supplierName", "supplierTaxId", "invoiceNumber", "invoiceDate", "totalAmount", "documentType"];
    for (const field of required) {
      if (!form[field]?.trim()) return "נא למלא את כל שדות החובה המסומנים ב-*";
    }
    if (!form.bankName?.trim() || !form.bankBranch?.trim() || !form.bankAccount?.trim()) {
      return "פרטי חשבון בנק הם שדות חובה";
    }
    if (!file) return "נא לצרף קובץ חשבונית";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (selectedProject) {
        formData.append("projectId", selectedProject._id);
        formData.append("projectName", selectedProject.name);
      }
      if (file) formData.append("file", file);

      await axios.post(`${BASE_URL}/pending-invoices/submit`, formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "שגיאה בשליחת הטופס, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">הוגש בהצלחה!</h2>
          <p className="text-gray-600 mb-6">החשבונית שלך התקבלה ותיבדק בקרוב על ידי הצוות.</p>
          <button
            onClick={() => { setForm(initialForm); setFile(null); setSelectedProject(null); setProjectSearch(""); setSubmitted(false); }}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
          >
            הגשת חשבונית נוספת
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* כותרת */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">הגשת חשבונית</h1>
          <p className="text-gray-400 text-sm">מלא את הטופס — הפרטים יישלחו לבדיקה ועיבוד</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* פרטי ספק */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">פרטי ספק / עסק</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  שם הספק / עסק <span className="text-red-400">*</span>
                </label>
                <input
                  name="supplierName"
                  value={form.supplierName}
                  onChange={handleChange}
                  placeholder="שם מלא"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ח.פ. / ת.ז. <span className="text-red-400">*</span>
                </label>
                <input
                  name="supplierTaxId"
                  value={form.supplierTaxId}
                  onChange={handleChange}
                  placeholder="מספר עוסק / ח.פ."
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">טלפון</label>
                <input
                  name="supplierPhone"
                  value={form.supplierPhone}
                  onChange={handleChange}
                  placeholder="050-0000000"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">אימייל</label>
                <input
                  name="supplierEmail"
                  type="email"
                  value={form.supplierEmail}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">כתובת</label>
                <input
                  name="supplierAddress"
                  value={form.supplierAddress}
                  onChange={handleChange}
                  placeholder="כתובת מלאה"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* פרטי בנק — חובה */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">פרטי חשבון בנק <span className="text-red-400">*</span></h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  שם הבנק <span className="text-red-400">*</span>
                </label>
                <input
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="לדוגמה: הפועלים"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  מספר סניף <span className="text-red-400">*</span>
                </label>
                <input
                  name="bankBranch"
                  value={form.bankBranch}
                  onChange={handleChange}
                  placeholder="למשל: 123"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  מספר חשבון <span className="text-red-400">*</span>
                </label>
                <input
                  name="bankAccount"
                  value={form.bankAccount}
                  onChange={handleChange}
                  placeholder="מספר חשבון"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* פרטי חשבונית */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">פרטי החשבונית</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  מספר חשבונית <span className="text-red-400">*</span>
                </label>
                <input
                  name="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={handleChange}
                  placeholder="מספר החשבונית"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  תאריך חשבונית <span className="text-red-400">*</span>
                </label>
                <input
                  name="invoiceDate"
                  type="date"
                  value={form.invoiceDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  סכום לתשלום (₪) <span className="text-red-400">*</span>
                </label>
                <input
                  name="totalAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  סוג מסמך <span className="text-red-400">*</span>
                </label>
                <select
                  name="documentType"
                  value={form.documentType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all"
                >
                  <option value="">בחר סוג מסמך</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* בחירת פרויקט עם חיפוש */}
              <div className="sm:col-span-2" ref={projectRef}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  <Briefcase className="inline w-4 h-4 ml-1 text-orange-400" />
                  פרויקט משויך (אופציונלי)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProjectOpen((v) => !v)}
                    className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-right flex items-center justify-between transition-all hover:border-orange-500 focus:outline-none focus:border-orange-500"
                  >
                    <span className={selectedProject ? "text-white" : "text-gray-400"}>
                      {selectedProject ? selectedProject.name : "בחר פרויקט..."}
                    </span>
                    {selectedProject && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedProject(null); setProjectSearch(""); }}
                        className="text-gray-400 hover:text-red-400 transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </button>

                  {projectOpen && (
                    <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-20 overflow-hidden">
                      <div className="p-2 border-b border-gray-700">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                          <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="חיפוש פרויקט..."
                            autoFocus
                            className="w-full pr-9 pl-3 py-2 bg-gray-700/60 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredProjects.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">לא נמצאו פרויקטים</p>
                        ) : (
                          filteredProjects.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => { setSelectedProject(p); setProjectOpen(false); setProjectSearch(""); }}
                              className={`w-full text-right px-4 py-2.5 text-sm transition-all border-b border-gray-700 last:border-b-0 ${
                                selectedProject?._id === p._id
                                  ? "bg-orange-500/20 text-orange-300"
                                  : "text-gray-300 hover:bg-gray-700"
                              }`}
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">פירוט / הערות</label>
                <textarea
                  name="detail"
                  value={form.detail}
                  onChange={handleChange}
                  rows={3}
                  placeholder="תיאור השירות או המוצר..."
                  className="w-full px-4 py-2.5 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* העלאת קובץ */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">
                צרף קובץ חשבונית <span className="text-red-400">*</span>
              </h2>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-orange-500 rounded-xl p-8 text-center cursor-pointer transition-all group"
            >
              <Upload className="w-10 h-10 text-gray-500 group-hover:text-orange-400 mx-auto mb-3 transition-all" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-400 font-medium text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-1">לחץ לבחירת קובץ</p>
                  <p className="text-gray-500 text-xs">PDF, JPG, PNG עד 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* שגיאה */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "שולח..." : "שלח חשבונית"}
          </button>
        </form>
      </div>
    </div>
  );
}
