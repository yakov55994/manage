import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { toast } from 'sonner';
import { ClipLoader } from 'react-spinners';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  User,
  Lock,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Save,
  X,
  FolderKanban,
  Building2
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, user: null });

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user',
    isActive: true,
    permissions: {
      projects: [],
      suppliers: []
    }
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      toast.error('אין לך הרשאה לעמוד זה', {
        className: "sonner-toast error rtl"
      });
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes, suppliersRes] = await Promise.all([
        api.get('/users'),
        api.get('/projects'),
        api.get('/suppliers/getAllSuppliers')
      ]);

      setUsers(usersRes.data.data || []);
      setProjects(projectsRes.data || []);
      
      if (suppliersRes.data && suppliersRes.data.success) {
        setSuppliers(suppliersRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת נתונים', {
        className: "sonner-toast error rtl"
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'user',
      isActive: true,
      permissions: {
        projects: [],
        suppliers: []
      }
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // לא ממלאים סיסמה בעריכה
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
      permissions: {
        projects: user.permissions?.projects?.map(p => p._id || p) || [],
        suppliers: user.permissions?.suppliers?.map(s => s._id || s) || []
      }
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ולידציות
    if (!formData.username) {
      toast.error('שם משתמש הוא שדה חובה', {
        className: "sonner-toast error rtl"
      });
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('סיסמה היא שדה חובה', {
        className: "sonner-toast error rtl"
      });
      return;
    }

    try {
      if (editingUser) {
        // עדכון משתמש קיים
        const updateData = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          permissions: formData.permissions
        };

        // הוסף סיסמה רק אם הוזנה
        if (formData.password) {
          updateData.password = formData.password;
        }

        await api.put(`/users/${editingUser._id}`, updateData);
        toast.success('המשתמש עודכן בהצלחה', {
          className: "sonner-toast success rtl"
        });
      } else {
        // יצירת משתמש חדש
        await api.post('/users', formData);
        toast.success('המשתמש נוצר בהצלחה', {
          className: "sonner-toast success rtl"
        });
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.message || 'שגיאה בשמירת המשתמש', {
        className: "sonner-toast error rtl"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${deleteModal.user._id}`);
      toast.success('המשתמש נמחק בהצלחה', {
        className: "sonner-toast success rtl"
      });
      setDeleteModal({ show: false, user: null });
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'שגיאה במחיקת המשתמש', {
        className: "sonner-toast error rtl"
      });
    }
  };

  const toggleProjectPermission = (projectId) => {
    setFormData(prev => {
      const projects = prev.permissions.projects.includes(projectId)
        ? prev.permissions.projects.filter(id => id !== projectId)
        : [...prev.permissions.projects, projectId];
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          projects
        }
      };
    });
  };



  const selectAllProjects = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        projects: projects.map(p => p._id)
      }
    }));
  };

  const clearAllProjects = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        projects: []
      }
    }));
  };

  const selectAllSuppliers = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        suppliers: suppliers.map(s => s._id)
      }
    }));
  };

  const clearAllSuppliers = () => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        suppliers: []
      }
    }));
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">אין הרשאה</h1>
          <p className="text-gray-600">עמוד זה מיועד למנהלי מערכת בלבד</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
          <ClipLoader size={80} color="#f97316" />
        </div>
        <h1 className="mt-6 font-bold text-2xl text-orange-900">טוען משתמשים...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-3 rounded-xl shadow-lg">
                <Users className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">ניהול משתמשים</h1>
                <p className="text-gray-600 mt-1">הוספה, עריכה והגדרת הרשאות</p>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>הוסף משתמש</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <th className="px-6 py-4 text-right font-bold">שם משתמש</th>
                  <th className="px-6 py-4 text-right font-bold">אימייל</th>
                  <th className="px-6 py-4 text-center font-bold">תפקיד</th>
                  <th className="px-6 py-4 text-center font-bold">סטטוס</th>
                  <th className="px-6 py-4 text-center font-bold">פרויקטים</th>
                  <th className="px-6 py-4 text-center font-bold">ספקים</th>
                  <th className="px-6 py-4 text-center font-bold">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user._id}
                    className={`border-b border-gray-200 transition-all duration-200 ${
                      index % 2 === 0 
                        ? 'bg-gradient-to-r from-orange-50/30 to-amber-50/30 hover:from-orange-100 hover:to-amber-100' 
                        : 'bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-600" />
                        {user.username}
                        {user._id === currentUser?.id && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">אתה</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {user.email || <span className="text-gray-400 italic">לא הוזן</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />
                          פעיל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          חסום
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {user.role === 'admin' ? (
                        <span className="text-purple-600 font-bold">הכל</span>
                      ) : user.permissions?.projects?.length > 0 ? (
                        <span className="text-green-600 font-bold">{user.permissions.projects.length}</span>
                      ) : (
                        <span className="text-blue-600 font-bold">הכל</span>
                      )}
                    </td>
                  
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg transition-all"
                          title="ערוך משתמש"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ show: true, user })}
                          disabled={user._id === currentUser?.id}
                          className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="מחק משתמש"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <User className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold">
                      {editingUser ? 'עריכת משתמש' : 'יצירת משתמש חדש'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 text-orange-600" />
                      שם משתמש
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl font-medium focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                      placeholder="הזן שם משתמש"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      סיסמה
                      {!editingUser && <span className="text-red-500">*</span>}
                      {editingUser && <span className="text-gray-500 text-xs">(השאר ריק אם לא משנה)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl font-medium focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder={editingUser ? "השאר ריק לשמירת סיסמה קיימת" : "הזן סיסמה"}
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      אימייל
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl font-medium focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                      placeholder="הזן אימייל (אופציונלי)"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      תפקיד
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer"
                    >
                      <option value="user">משתמש</option>
                      <option value="admin">מנהל</option>
                    </select>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    משתמש פעיל (ביטול סימון חוסם את המשתמש)
                  </label>
                </div>

                {/* Permissions Section - Only for non-admin users */}
                {formData.role !== 'admin' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border-2 border-amber-200">
                      <p className="text-sm text-gray-700 font-medium flex items-start gap-2">
                        <span className="text-amber-600 text-xl">💡</span>
                        <span>
                          <strong>שים לב:</strong> אם לא תבחר שום פרויקט/ספק, המשתמש יוכל לראות הכל.
                          בחר פרויקטים/ספקים ספציפיים כדי להגביל גישה.
                        </span>
                      </p>
                    </div>

                    {/* Projects Permissions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 text-lg font-bold text-gray-900">
                          <FolderKanban className="w-5 h-5 text-blue-600" />
                          הרשאות פרויקטים
                          <span className="text-sm font-normal text-gray-600">
                            ({formData.permissions.projects.length} נבחרו)
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllProjects}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            בחר הכל
                          </button>
                          <button
                            type="button"
                            onClick={clearAllProjects}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            נקה הכל
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-xl border-2 border-gray-200">
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <label
                              key={project._id}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                formData.permissions.projects.includes(project._id)
                                  ? 'bg-blue-100 border-blue-400'
                                  : 'bg-white border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.projects.includes(project._id)}
                                onChange={() => toggleProjectPermission(project._id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-900">{project.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="col-span-3 text-center text-gray-500 py-4">אין פרויקטים במערכת</p>
                        )}
                      </div>
                    </div>

                    {/* Suppliers Permissions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                 
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllSuppliers}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            בחר הכל
                          </button>
                          <button
                            type="button"
                            onClick={clearAllSuppliers}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                          >
                            נקה הכל
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-xl border-2 border-gray-200">
             
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Note */}
                {formData.role === 'admin' && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                    <p className="text-sm text-purple-900 font-medium flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span>מנהלים מקבלים גישה מלאה לכל הפרויקטים והספקים אוטומטית</span>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-300 shadow-lg hover:shadow-xl font-bold"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingUser ? 'עדכן משתמש' : 'צור משתמש'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-bold"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-red-500 to-rose-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">אישור מחיקה</h2>
                </div>
              </div>

              <div className="p-6">
                <p className="text-lg text-gray-700 text-center mb-2">
                  האם אתה בטוח שברצונך למחוק את המשתמש
                </p>
                <p className="text-xl font-bold text-center text-gray-900 mb-4">
                  {deleteModal.user?.username}?
                </p>
                <p className="text-red-600 text-center font-semibold mb-6">
                  פעולה זו אינה ניתנת לביטול!
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl font-bold"
                  >
                    מחק משתמש
                  </button>
                  <button
                    onClick={() => setDeleteModal({ show: false, user: null })}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300 font-bold"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;