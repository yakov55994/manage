// =============================================
// USER MANAGEMENT – REFINED HERO UI STYLE
// =============================================
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
  Search,
  FileText,
  Package,
  Building2,
  Folder,
  Zap,
  Filter,
  CheckSquare,
  Square,
  Copy,
  TrendingUp,
} from "lucide-react";

// Helpers
const normalizeId = (id) => String(id?._id || id || "");

const defaultProjPerm = (projectId) => ({
  project: normalizeId(projectId),
  access: "view", // כללית
  modules: {
    invoices: "view",
    orders: "view",
    suppliers: "view",
    files: "view",
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

  // Search and filter
  const [projectSearch, setProjectSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
    isActive: true,
    permissions: [],
  });

  // בתוך הקומפוננטה UserManagement, הוסף פונקציה:

  const handleSendResetLink = async (user) => {
    if (!user.email) {
      toast.error("למשתמש אין כתובת אימייל");
      return;
    }

    try {
      await api.post("/users/send-reset-link", { userId: user._id });
      toast.success(`קישור איפוס סיסמה נשלח ל-${user.email}`);
    } catch (error) {
      console.error("Error sending reset link:", error);
      toast.error(error.response?.data?.message || "שגיאה בשליחת קישור איפוס");
    }
  };
  // Check if project selected
  const isProjectSelected = (projectId) =>
    formData.permissions.some((p) => String(p.project) === String(projectId));

  // TOGGLE project
  const toggleProject = (projectId) => {
    const id = normalizeId(projectId);

    setFormData((prev) => {
      const exists = prev.permissions.some(
        (p) => normalizeId(p.project) === id
      );

      if (exists) {
        return {
          ...prev,
          permissions: prev.permissions.filter(
            (p) => normalizeId(p.project) !== id
          ),
        };
      }

      return {
        ...prev,
        permissions: [...prev.permissions, defaultProjPerm(id)],
      };
    });
  };

  // NEW: Select all filtered projects
  const selectAllProjects = () => {
    setFormData((prev) => {
      const newPerms = [...prev.permissions];
      filteredProjects.forEach((p) => {
        const id = normalizeId(p._id);
        const exists = newPerms.some((x) => String(x.project) === id);
        if (!exists) {
          newPerms.push(defaultProjPerm(id));
        }
      });
      return { ...prev, permissions: newPerms };
    });
    toast.success(`נבחרו ${filteredProjects.length} פרויקטים`);
  };

  // NEW: Deselect all filtered projects
  const deselectAllProjects = () => {
    setFormData((prev) => {
      const filteredIds = filteredProjects.map((p) => String(p._id));
      const newPerms = prev.permissions.filter(
        (x) => !filteredIds.includes(String(x.project))
      );
      return { ...prev, permissions: newPerms };
    });
    toast.success("הפרויקטים בוטלו");
  };

  // NEW: Apply preset to all selected projects
  const applyPresetToAll = (preset) => {
    setFormData((prev) => {
      const newPerms = prev.permissions.map((perm) => {
        if (preset === "view-all") {
          return {
            ...perm,
            access: "view",
            modules: {
              invoices: "view",
              orders: "view",
              suppliers: "view",
              files: "view",
            },
          };
        } else if (preset === "edit-all") {
          return {
            ...perm,
            access: "edit",
            modules: {
              invoices: "edit",
              orders: "edit",
              suppliers: "edit",
              files: "edit",
            },
          };
        } else if (preset === "none-all") {
          return {
            ...perm,
            access: "none",
            modules: {
              invoices: "none",
              orders: "none",
              suppliers: "none",
              files: "none",
            },
          };
        }
        return perm;
      });
      return { ...prev, permissions: newPerms };
    });

    const messages = {
      "view-all": "הוגדרה צפייה לכל הפרויקטים",
      "edit-all": "הוגדרה עריכה לכל הפרויקטים",
      "none-all": "הוסרה גישה מכל הפרויקטים",
    };
    toast.success(messages[preset]);
  };

  // SET module access
  const setModuleAccess = (projectId, moduleKey, value) => {
    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex(
        (p) => String(p.project) === String(projectId)
      );
      if (idx < 0) return prev;
      list[idx] = {
        ...list[idx],
        modules: { ...list[idx].modules, [moduleKey]: value },
      };
      return { ...prev, permissions: list };
    });
  };

  // Set all modules in a project at once
  const setAllModulesInProject = (projectId, value) => {
    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex(
        (p) => String(p.project) === String(projectId)
      );
      if (idx < 0) return prev;
      list[idx] = {
        ...list[idx],
        modules: {
          invoices: value,
          orders: value,
          suppliers: value,
          files: value,
        },
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
      email: "",
      role: "user",
      isActive: true,
      permissions: [],
    });
    setProjectSearch("");
    setShowModal(true);
  };

  // EDIT USER
  const openEdit = (user) => {
    const normalizedPermissions = (user.permissions || []).map((p) => ({
      project: normalizeId(p.project),
      access: p.access || "none",
      modules: {
        invoices: p.modules?.invoices || "none",
        orders: p.modules?.orders || "none",
        suppliers: p.modules?.suppliers || "none",
        files: p.modules?.files || "none",
      },
    }));

    setEditingUser(user);

    setFormData({
      username: user.username,
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
      permissions: normalizedPermissions,
    });

    setProjectSearch("");
    setShowModal(true);
  };

  const autoFixProjectAccess = (perm) => {
    const levels = { none: 0, view: 1, edit: 2 };
    const maxLevel = Math.max(
      levels[perm.modules.invoices],
      levels[perm.modules.orders],
      levels[perm.modules.suppliers],
      levels[perm.modules.files]
    );

    const names = ["none", "view", "edit"];
    return {
      ...perm,
      access: names[maxLevel],
    };
  };

  // SAVE USER
  const saveUser = async (e) => {
    e.preventDefault();

    const payload = {
      username: formData.username,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive,
      permissions: formData.permissions.map((p) =>
        autoFixProjectAccess({
          project: normalizeId(p.project),
          access: p.access,
          modules: p.modules,
        })
      ),
    };

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
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "שגיאה בשמירת המשתמש");
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

  // Filter projects by search
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Filter users by status
  const filteredUsers = users.filter((u) => {
    if (filterStatus === "active") return u.isActive;
    if (filterStatus === "inactive") return !u.isActive;
    return true;
  });

  // Calculate percentage of projects selected
  const selectedPercentage =
    projects.length > 0
      ? Math.round((formData.permissions.length / projects.length) * 100)
      : 0;

  // Module icons
  const moduleIcons = {
    invoices: FileText,
    orders: Package,
    suppliers: Building2,
    files: Folder,
  };

  const moduleLabels = {
    invoices: "חשבוניות",
    orders: "הזמנות",
    suppliers: "ספקים",
    files: "קבצים",
  };

  // UI
  if (loading || authLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-8"
        dir="rtl"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <ClipLoader color="#f97316" size={60} />
            <h1 className="font-bold text-3xl text-slate-900 text-center">
              טוען רשימת משתמשים...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
        <Shield className="w-20 h-20 text-black mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">אין הרשאה</h2>
      </div>
    );
  }

  const setProjectAccess = (projectId, accessValue) => {
    setFormData((prev) => {
      const list = [...prev.permissions];
      const idx = list.findIndex(
        (p) => String(p.project) === String(projectId)
      );
      if (idx < 0) return prev;

      list[idx] = {
        ...list[idx],
        access: accessValue,
      };

      return { ...prev, permissions: list };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 p-8">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <Users className="w-10 h-10 " />
              </div>
              <div>
                <h1 className="text-3xl font-bold  mb-2">ניהול משתמשים</h1>
                <p className="">ניהול גישות והרשאות</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="bg-white text-black px-6 py-3 rounded-3xl font-semibold hover:bg-black hover:text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              משתמש חדש
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <Filter className="w-5 h-5 " />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent  font-semibold outline-none cursor-pointer"
              >
                <option value="all" className="text-gray-800">
                  כל המשתמשים
                </option>
                <option value="active" className="text-gray-800">
                  משתמשים פעילים
                </option>
                <option value="inactive" className="text-gray-800">
                  משתמשים לא פעילים
                </option>
              </select>
            </div>
            <div className="/90 font-semibold">
              {filteredUsers.length} משתמשים
            </div>
          </div>
        </div>

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-orange-100"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-orange-300 to-amber-300 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/30 backdrop-blur-sm p-3 rounded-xl">
                    <UserCircle className="w-10 h-10 " />
                  </div>
                  <div className="flex gap-2">
                    {/* כפתור איפוס סיסמה */}
                    <button
                      onClick={() => handleSendResetLink(u)}
                      disabled={!u.email}
                      className={`bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/40 transition-all ${
                        !u.email
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      title={
                        u.email ? "שלח קישור איפוס סיסמה" : "אין כתובת אימייל"
                      }
                    >
                      <Mail className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEdit(u)}
                      className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/40 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 " />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ show: true, user: u })}
                      disabled={currentUser.id === u._id}
                      className={`bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/40 transition-all cursor-pointer ${
                        currentUser.id === u._id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Trash2 className="w-4 h-4 " />
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-bold  mb-1">{u.username}</h3>
                <div className="flex items-center gap-2 text-black">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{u.email || "אין אימייל"}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Role Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-black" />
                    תפקיד
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      u.role === "admin"
                        ? "bg-gradient-to-r from-orange-400 to-amber-400 "
                        : "bg-orange-100 text-black"
                    }`}
                  >
                    {u.role === "admin" ? "מנהל מערכת" : "משתמש רגיל"}
                  </span>
                </div>

                {/* Projects Count */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-black" />
                    פרויקטים
                  </span>
                  <span className="text-black font-semibold">
                    {u.role === "admin"
                      ? "גישה מלאה"
                      : `${u.permissions?.length || 0} פרויקטים`}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">סטטוס</span>
                  <div className="flex items-center gap-2">
                    {u.isActive ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-black" />
                        <span className="text-black font-semibold">פעיל</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-black" />
                        <span className="text-black font-semibold">
                          לא פעיל
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-400 to-amber-400 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold  flex items-center gap-3">
                  <UserCircle className="w-8 h-8" />
                  {editingUser ? "עריכת משתמש" : "יצירת משתמש חדש"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-all"
                >
                  <X className="w-6 h-6 " />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={saveUser} className="flex-1 overflow-y-auto p-6">
              {/* BASIC FIELDS */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border border-orange-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-black" />
                  פרטי משתמש
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      שם משתמש *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="הזן שם משתמש"
                      className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                    />
                  </div>
                  {/* במקום שדה הסיסמה */}
                  {!editingUser && (
                    <div className="col-span-2">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-bold text-blue-900">
                              שליחת מייל אוטומטית
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              המשתמש יקבל מייל עם קישור לבחירת סיסמה
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {editingUser && (
                    <div className="col-span-2">
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-bold text-amber-900">
                              לשינוי סיסמה
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              לחץ על כפתור המייל בכרטיס המשתמש לשליחת קישור
                              איפוס סיסמה
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      אימייל
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="example@domain.com"
                      className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      תפקיד
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="user">משתמש רגיל</option>
                      <option value="admin">מנהל מערכת</option>
                    </select>
                  </div>
                </div>

                {/* Active Status Toggle */}
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-5 h-5 text-black rounded focus:ring-orange-400 cursor-pointer"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-semibold text-gray-700 cursor-pointer"
                  >
                    משתמש פעיל
                  </label>
                </div>
              </div>

              {/* PROJECT PERMISSIONS */}
              {formData.role !== "admin" && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-black" />
                      הרשאות פרויקטים
                    </h3>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-black" />
                      <span className="text-sm font-semibold text-gray-600">
                        {formData.permissions.length} מתוך {projects.length}{" "}
                        נבחרו
                      </span>
                      <span className="text-xs text-gray-500">
                        ({selectedPercentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Search + Bulk Actions */}
                  <div className="space-y-3 mb-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="חפש פרויקט..."
                        className="w-full pr-10 p-3 border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Bulk Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = filteredProjects.every((p) =>
                            formData.permissions.some(
                              (perm) => String(perm.project) === String(p._id)
                            )
                          );

                          if (allSelected) {
                            deselectAllProjects(); // אם כולם נבחרו → בטל הכל
                          } else {
                            selectAllProjects(); // אחרת → בחר הכל
                          }
                        }}
                        className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-all flex items-center gap-2 text-sm font-semibold"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {filteredProjects.every((p) =>
                          formData.permissions.some(
                            (perm) => String(perm.project) === String(p._id)
                          )
                        )
                          ? "בטל הכל"
                          : `בחר הכל (${filteredProjects.length})`}
                      </button>

                      <button
                        type="button"
                        onClick={deselectAllProjects}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2 text-sm font-semibold"
                      >
                        <Square className="w-4 h-4" />
                        בטל הכל
                      </button>
                      <div className="h-6 w-px bg-gray-300"></div>
                      <span className="text-xs text-gray-600 font-semibold">
                        הגדר לכולם:
                      </span>
                      <button
                        type="button"
                        onClick={() => applyPresetToAll("view-all")}
                        disabled={formData.permissions.length === 0}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        צפייה
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetToAll("edit-all")}
                        disabled={formData.permissions.length === 0}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        עריכה
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetToAll("none-all")}
                        disabled={formData.permissions.length === 0}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        חסום
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredProjects.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        לא נמצאו פרויקטים
                      </div>
                    )}

                    {filteredProjects.map((p) => {
                      const selected = isProjectSelected(p._id);
                      const proj = formData.permissions.find(
                        (x) => String(x.project) === String(p._id)
                      );

                      return (
                        <div
                          key={p._id}
                          className={`rounded-xl border-2 transition-all ${
                            selected
                              ? "border-orange-400 bg-white shadow-md"
                              : "border-orange-200 bg-white/50"
                          }`}
                        >
                          {/* Project Header */}
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleProject(p._id)}
                                className="w-5 h-5 text-black rounded focus:ring-orange-400 cursor-pointer"
                              />
                              <FolderKanban className="w-5 h-5 text-black" />
                              <span className="font-bold text-gray-800 flex-1">
                                {p.name}
                              </span>
                              {selected && (
                                <div className="flex items-center gap-2">
                                  {[
                                    {
                                      value: "view",
                                      label: "צפייה",
                                      icon: Eye,
                                    },
                                    {
                                      value: "edit",
                                      label: "עריכה",
                                      icon: Edit2,
                                    },
                                    { value: "none", label: "חסום", icon: X },
                                  ].map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() =>
                                          setProjectAccess(p._id, opt.value)
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                                          proj?.access === opt.value
                                            ? "bg-gradient-to-r from-orange-400 to-amber-400  shadow-md"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                      >
                                        <Icon className="w-3.5 h-3.5" />
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          {selected && (
                            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                              <Zap className="w-4 h-4 text-black" />
                              <span className="text-sm text-gray-600 font-semibold">
                                פעולות מהירות:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setAllModulesInProject(p._id, "view")
                                }
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                              >
                                צפייה בכל
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAllModulesInProject(p._id, "edit")
                                }
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                              >
                                עריכה בכל
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAllModulesInProject(p._id, "none")
                                }
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                              >
                                ללא גישה לכל
                              </button>
                            </div>
                          )}

                          {/* Modules Grid */}
                          {selected && (
                            <div className="px-4 pb-4">
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(moduleLabels).map(
                                  ([key, label]) => {
                                    const Icon = moduleIcons[key];
                                    return (
                                      <div
                                        key={key}
                                        className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <Icon className="w-4 h-4 text-black" />
                                          <span className="text-sm font-semibold text-gray-700">
                                            {label}
                                          </span>
                                        </div>
                                        <select
                                          value={proj?.modules?.[key] || "none"}
                                          onChange={(e) =>
                                            setModuleAccess(
                                              p._id,
                                              key,
                                              e.target.value
                                            )
                                          }
                                          className="w-full p-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none cursor-pointer"
                                        >
                                          <option value="view">צפייה</option>
                                          <option value="edit">עריכה</option>
                                          <option value="none">ללא גישה</option>
                                        </select>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex gap-4">
                <button
                  type="submit"
                  onClick={saveUser}
                  className="flex-1 bg-gradient-to-r from-orange-400 to-amber-400  p-4 rounded-xl hover:from-orange-500 hover:to-amber-500 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Save className="w-5 h-5" />
                  שמור שינויים
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500  p-4 rounded-xl hover:from-gray-500 hover:to-gray-600 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <X className="w-5 h-5" />
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
              <h2 className="text-2xl font-bold  flex items-center gap-3">
                <Trash2 className="w-8 h-8" />
                מחיקת משתמש
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-lg">
                האם אתה בטוח שברצונך למחוק את המשתמש{" "}
                <span className="font-bold text-orange-500">
                  {deleteModal.user.username}
                </span>{" "}
                ?
              </p>
            </div>
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex gap-4">
                <button
                  onClick={deleteUser}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600  p-4 rounded-xl hover:from-red-600 hover:to-red-700 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  מחק משתמש
                </button>
                <button
                  onClick={() => setDeleteModal({ show: false, user: null })}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500  p-4 rounded-xl hover:from-gray-500 hover:to-gray-600 font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
