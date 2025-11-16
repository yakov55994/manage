// =============================
// USER MANAGEMENT – FIXED VERSION
// =============================
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
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
} from "lucide-react";

// Helpers
const normalizeId = (id) => String(id?._id || id || "");

const defaultProjPerm = (projectId) => ({
  project: normalizeId(projectId),
  access: "view",
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
  const [showPassword, setShowPassword] = useState(false);

  // permissions MUST ALWAYS be array
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    role: "user",
    isActive: true,
    permissions: [], // array only
  });

  // check if project selected
  const isProjectSelected = (projectId) =>
    formData.permissions.some(
      (p) => String(p.project) === String(projectId)
    );

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
      const idx = list.findIndex(
        (p) => String(p.project) === String(projectId)
      );

      if (idx < 0) return prev;

      list[idx] = { ...list[idx], access };

      return { ...prev, permissions: list };
    });
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
      permissions: normalized, // ARRAY ONLY
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
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={80} color="#f97316" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-10 text-center text-red-600">אין הרשאה</div>;
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex gap-3 items-center">
          <Users className="text-orange-600" /> ניהול משתמשים
        </h1>

        <button
          onClick={openCreate}
          className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
        >
          <Plus /> משתמש חדש
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow p-4">
        <table className="w-full">
          <thead>
            <tr className="bg-orange-500 text-white">
              <th className="p-3 text-right">שם</th>
              <th className="p-3 text-right">אימייל</th>
              <th className="p-3 text-center">תפקיד</th>
              <th className="p-3 text-center">פרויקטים</th>
              <th className="p-3 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b hover:bg-orange-50">
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.email || "-"}</td>
                <td className="p-3 text-center">
                  {u.role === "admin" ? "מנהל" : "משתמש"}
                </td>
                <td className="p-3 text-center">
                  {u.role === "admin" ? "הכל" : u.permissions?.length}
                </td>
                <td className="p-3 text-center space-x-3">
                  <button onClick={() => openEdit(u)}>
                    <Edit2 />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ show: true, user: u })}
                    disabled={currentUser.id === u._id}
                  >
                    <Trash2 className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-6 z-50">
          <div className="bg-white max-w-3xl w-full p-6 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 flex gap-2 items-center">
              <User /> {editingUser ? "עריכת משתמש" : "משתמש חדש"}
            </h2>

            <form onSubmit={saveUser} className="space-y-6">
              {/* BASIC FIELDS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-semibold">שם משתמש</label>
                  <input
                    required
                    className="w-full p-2 border rounded"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block mb-2 font-semibold">
                    סיסמה {!editingUser && "*"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingUser}
                      className="w-full p-2 border rounded"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 font-semibold">אימייל</label>
                  <input
                    type="email"
                    className="w-full p-2 border rounded"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block mb-2 font-semibold">תפקיד</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <option value="user">משתמש</option>
                    <option value="admin">מנהל</option>
                  </select>
                </div>
              </div>

              {/* PROJECT PERMISSIONS */}
              {formData.role !== "admin" && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold flex gap-2 items-center mb-4">
                    <FolderKanban /> הרשאות פרויקטים
                  </h3>

                  <div className="grid gap-4">
                    {projects.map((p) => {
                      const selected = isProjectSelected(p._id);
                      const proj = formData.permissions.find(
                        (x) => String(x.project) === String(p._id)
                      );

                      return (
                        <div
                          key={p._id}
                          className={`border p-4 rounded-xl ${
                            selected
                              ? "bg-blue-50 border-blue-400"
                              : "bg-gray-50 border-gray-300"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <label className="flex gap-3 items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={selected}
                                onChange={() => toggleProject(p._id)}
                              />
                              <span className="font-bold text-lg">
                                {p.name}
                              </span>
                            </label>

                            {selected && (
                              <div className="flex gap-6">
                                <label className="flex gap-2 items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`access-${p._id}`}
                                    className="w-4 h-4"
                                    checked={proj.access === "view"}
                                    onChange={() =>
                                      setProjectAccess(p._id, "view")
                                    }
                                  />
                                  <span>צפייה</span>
                                </label>

                                <label className="flex gap-2 items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`access-${p._id}`}
                                    className="w-4 h-4"
                                    checked={proj.access === "edit"}
                                    onChange={() =>
                                      setProjectAccess(p._id, "edit")
                                    }
                                  />
                                  <span>עריכה</span>
                                </label>
                              </div>
                            )}
                          </div>

                          {selected && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 p-3 bg-white border rounded-xl">
                              {[
                                { key: "invoices", label: "חשבוניות" },
                                { key: "orders", label: "הזמנות" },
                                { key: "suppliers", label: "ספקים" },
                                { key: "files", label: "קבצים" },
                              ].map((m) => (
                                <div key={m.key}>
                                  <label className="block mb-1 font-semibold text-sm">
                                    {m.label}
                                  </label>
                                  <select
                                    className="w-full border p-2 rounded"
                                    value={proj.modules[m.key]}
                                    onChange={(e) =>
                                      setModuleAccess(
                                        p._id,
                                        m.key,
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="view">צפייה</option>
                                    <option value="edit">עריכה</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 mt-6 sticky bottom-0 bg-white py-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white p-3 rounded-xl hover:bg-orange-700 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  שמור
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 p-3 rounded-xl hover:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-6 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <Trash2 size={28} />
              מחיקת משתמש
            </h2>
            <p className="mb-6 text-lg">
              האם אתה בטוח שברצונך למחוק את המשתמש
              <strong> {deleteModal.user.username} </strong>?
            </p>
            <div className="flex gap-4">
              <button
                onClick={deleteUser}
                className="flex-1 bg-red-600 text-white p-3 rounded-xl hover:bg-red-700"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, user: null })}
                className="flex-1 bg-gray-300 p-3 rounded-xl hover:bg-gray-400"
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
