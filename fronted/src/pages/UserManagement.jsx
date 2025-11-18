// =============================
// USER MANAGEMENT – MODERN DESIGN
// =============================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api.js";
import { toast } from "sonner";
import { ClipLoader } from "react-spinners";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Eye,
  EyeOff,
  Save,
  X,
  FolderKanban,
  Mail,
  Shield,
  UserCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Helpers
const normalizeId = (id) => String(id?._id || id || "");

const defaultProjPerm = (projectId) => ({
  project: normalizeId(projectId),
  access: "view",
  modules: {
    invoices: "none",
    orders: "none",
    suppliers: "none",
    files: "none",
  },
});

export default function UserManagement() {
  const { user: currentUser, isAdmin, loading: authLoading } = useAuth();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    role: "user",
    isActive: true,
    permissions: [],
  });

  // check if project selected
  const isProjectSelected = (projectId) =>
    formData.permissions.some((p) => String(p.project) === String(projectId));

  // TOGGLE project
  const toggleProject = (projectId) => {
    const id = normalizeId(projectId);

    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex((p) => String(p.project) === id);

      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(defaultProjPerm(id));
      }

      return { ...prev, permissions: list };
    });
  };

  // SET access level
  const setProjectAccess = (projectId, access) => {
    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex((p) => String(p.project) === String(projectId));

      if (idx < 0) return prev;

      list[idx] = { ...list[idx], access };

      return { ...prev, permissions: list };
    });
  };

  // SET module access
  const setModuleAccess = (projectId, moduleKey, value) => {
    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex((p) => String(p.project) === String(projectId));

      if (idx < 0) return prev;

      list[idx] = {
        ...list[idx],
        modules: { ...list[idx].modules, [moduleKey]: value },
      };

      return { ...prev, permissions: list };
    });
  };

  // LOAD EVERYTHING
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      toast.error("אין לך הרשאה לעמוד זה");
      setLoading(false);
      return;
    }
    loadEverything();
  }, [authLoading, isAdmin]);

  const loadEverything = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        api.get("/users"),
        api.get("/projects"),
      ]);
      setUsers(usersRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  };

  // CREATE NEW USER
  const openCreate = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      email: "",
      role: "user",
      isActive: true,
      permissions: [],
    });
    setShowModal(true);
  };

  // EDIT USER
  const openEdit = (user) => {
    const normalized =
      (user.permissions || []).map((p) => ({
        project: String(p.project._id || p.project),
        access: p.access || "view",
        modules: {
          invoices: p.modules?.invoices || "view",
          orders: p.modules?.orders || "view",
          suppliers: p.modules?.suppliers || "view",
          files: p.modules?.files || "view",
        },
      })) || [];

    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
      permissions: normalized,
    });

    setShowModal(true);
  };

  // SAVE USER
  const saveUser = async (e) => {
    e.preventDefault();

    const payload = {
      username: formData.username,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive,
      permissions: formData.permissions,
    };

    if (formData.password) payload.password = formData.password;

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, payload);
        toast.success("המשתמש עודכן בהצלחה");
      } else {
        await api.post(`/users`, payload);
        toast.success("המשתמש נוצר בהצלחה");
      }
      setShowModal(false);
      loadEverything();
    } catch (error) {
      toast.error(error.response?.data?.message || "שגיאה בשמירת המשתמש");
    }
  };

  const deleteUser = async () => {
    try {
      await api.delete(`/users/${deleteModal.user._id}`);
      toast.success("המשתמש נמחק");
      setDeleteModal({ show: false, user: null });
      loadEverything();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // UI
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <ClipLoader size={80} color="#8b5cf6" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <XCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-red-600">אין הרשאה</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-xl">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">ניהול משתמשים</h1>
              <p className="text-gray-500">ניהול גישות והרשאות</p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={20} />
            <span className="font-semibold">משתמש חדש</span>
          </button>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <div
            key={u._id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <UserCircle size={40} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ show: true, user: u })}
                    disabled={currentUser.id === u._id}
                    className={`bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-all ${
                      currentUser.id === u._id ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-1">{u.username}</h3>
              <p className="text-purple-100 text-sm flex items-center gap-2">
                <Mail size={14} />
                {u.email || "אין אימייל"}
              </p>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-4">
              {/* Role Badge */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center gap-2">
                  <Shield size={18} />
                  תפקיד
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    u.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {u.role === "admin" ? "מנהל מערכת" : "משתמש רגיל"}
                </span>
              </div>

              {/* Projects Count */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium flex items-center gap-2">
                  <FolderKanban size={18} />
                  פרויקטים
                </span>
                <span className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full text-sm font-bold">
                  {u.role === "admin" ? "גישה מלאה" : `${u.permissions?.length || 0} פרויקטים`}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">סטטוס</span>
                <div className="flex items-center gap-2">
                  {u.isActive ? (
                    <>
                      <CheckCircle size={18} className="text-green-500" />
                      <span className="text-green-600 font-semibold">פעיל</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={18} className="text-red-500" />
                      <span className="text-red-600 font-semibold">לא פעיל</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-6 z-50">
          <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 text-white">
              <h2 className="text-3xl font-bold flex gap-3 items-center">
                <User size={32} />
                {editingUser ? "עריכת משתמש" : "יצירת משתמש חדש"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6">
              <form onSubmit={saveUser} className="space-y-6">
                {/* BASIC FIELDS */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserCircle className="text-purple-600" />
                    <span>פרטי משתמש</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">
                        שם משתמש *
                      </label>
                      <input
                        required
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        placeholder="הזן שם משתמש"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">
                        סיסמה {!editingUser && "*"}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required={!editingUser}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          placeholder={editingUser ? "השאר ריק אם לא משנה" : "הזן סיסמה"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-600"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">אימייל</label>
                      <input
                        type="email"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="example@domain.com"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-semibold text-gray-700">תפקיד</label>
                      <select
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                      >
                        <option value="user">משתמש רגיל</option>
                        <option value="admin">מנהל מערכת</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* PROJECT PERMISSIONS */}
                {formData.role !== "admin" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-xl">
                        <FolderKanban className="text-white" size={24} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">הרשאות פרויקטים</h3>
                    </div>

                    <div className="space-y-4">
                      {projects.map((p) => {
                        const selected = isProjectSelected(p._id);
                        const proj = formData.permissions.find(
                          (x) => String(x.project) === String(p._id)
                        );

                        return (
                          <div
                            key={p._id}
                            className={`border-2 rounded-2xl transition-all duration-300 ${
                              selected
                                ? "bg-gradient-to-br from-blue-50 to-purple-50 border-purple-300 shadow-lg"
                                : "bg-white border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-center mb-4">
                                <label className="flex gap-3 items-center cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    className="w-6 h-6 rounded border-2 border-gray-300 text-purple-600 focus:ring-purple-500"
                                    checked={selected}
                                    onChange={() => toggleProject(p._id)}
                                  />
                                  <span className="font-bold text-xl text-gray-800 group-hover:text-purple-600 transition-colors">
                                    {p.name}
                                  </span>
                                </label>

                                {selected && (
                                  <div className="flex gap-3">
                                    {[
                                      { value: "view", label: "צפייה", color: "blue" },
                                      { value: "edit", label: "עריכה", color: "green" },
                                      { value: "none", label: "ללא גישה", color: "gray" },
                                    ].map((opt) => (
                                      <label
                                        key={opt.value}
                                        className="flex gap-2 items-center cursor-pointer group"
                                      >
                                        <input
                                          type="radio"
                                          name={`access-${p._id}`}
                                          className={`w-5 h-5 text-${opt.color}-600`}
                                          checked={proj.access === opt.value}
                                          onChange={() => setProjectAccess(p._id, opt.value)}
                                        />
                                        <span className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                                          {opt.label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {selected && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-xl border border-purple-100">
                                  {[
                                    { key: "invoices", label: "חשבוניות", icon: "📄" },
                                    { key: "orders", label: "הזמנות", icon: "📦" },
                                    { key: "suppliers", label: "ספקים", icon: "🏢" },
                                    { key: "files", label: "קבצים", icon: "📁" },
                                  ].map((m) => (
                                    <div key={m.key}>
                                      <label className="block mb-2 font-semibold text-sm text-gray-700">
                                        {m.icon} {m.label}
                                      </label>
                                      <select
                                        className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                                        value={proj.modules[m.key]}
                                        onChange={(e) =>
                                          setModuleAccess(p._id, m.key, e.target.value)
                                        }
                                      >
                                        <option value="view">צפייה</option>
                                        <option value="edit">עריכה</option>
                                        <option value="none">ללא גישה</option>
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t p-6 flex gap-4">
              <button
                onClick={saveUser}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl hover:from-green-600 hover:to-emerald-600 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Save size={20} />
                שמור שינויים
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white p-4 rounded-xl hover:from-gray-500 hover:to-gray-600 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <X size={20} />
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-6 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} className="text-red-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">
              מחיקת משתמש
            </h2>

            <p className="text-gray-600 text-center mb-6 text-lg">
              האם אתה בטוח שברצונך למחוק את המשתמש
              <br />
              <strong className="text-red-600">{deleteModal.user.username}</strong>?
            </p>

            <div className="flex gap-4">
              <button
                onClick={deleteUser}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                מחק משתמש
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, user: null })}
                className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white p-4 rounded-xl hover:from-gray-500 hover:to-gray-600 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}