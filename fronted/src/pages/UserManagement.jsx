import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit3, Trash2, Save, X, 
  Eye, EyeOff, Shield, UserPlus, Settings,
  CheckCircle, AlertCircle, User, Mail, Phone, Lock
} from 'lucide-react';
import api from '../api/api.jsx';
import { toast } from 'sonner';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    permissions: {
      projects: false,
      invoices: false,
      suppliers: false,
      orders: false,
      reports: false
    }
  });

  // טעינת משתמשים מהשרת
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('שגיאה בטעינת המשתמשים', {
        className: "sonner-toast error rtl"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      toast.error('אנא מלא את כל השדות הנדרשים', {
        className: "sonner-toast error rtl"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (editingUser) {
        // עדכון משתמש קיים
        const response = await api.put(`/users/${editingUser._id}`, formData);
        
        setUsers(users.map(user => 
          user.id === editingUser.id ? response.data : user
        ));
        
        toast.success('המשתמש עודכן בהצלחה! ✨', {
          className: "sonner-toast success rtl"
        });
      } else {
        // יצירת משתמש חדש
        const response = await api.post('/users', formData);
        
        setUsers([...users, response.data]);
        
        toast.success('המשתמש נוצר בהצלחה! 🎉', {
          className: "sonner-toast success rtl"
        });
      }
      
      handleCloseForm();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.message || 'שגיאה בשמירת המשתמש';
      toast.error(errorMessage, {
        className: "sonner-toast error rtl"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      permissions: user.permissions || {
        projects: false,
        invoices: false,
        suppliers: false,
        orders: false,
        reports: false
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      
      toast.success('המשתמש נמחק בהצלחה! 🗑️', {
        className: "sonner-toast success rtl"
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('שגיאה במחיקת המשתמש', {
        className: "sonner-toast error rtl"
      });
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'פעיל' ? 'לא פעיל' : 'פעיל';
    
    try {
      await api.patch(`/users/${userId}/status`, { status: newStatus });
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
      
      toast.success(`סטטוס המשתמש שונה ל-${newStatus}`, {
        className: "sonner-toast success rtl"
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('שגיאה בעדכון סטטוס המשתמש', {
        className: "sonner-toast error rtl"
      });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      phone: '',
      permissions: {
        projects: false,
        invoices: false,
        suppliers: false,
        orders: false,
        reports: false
      }
    });
    setShowPassword(false);
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const getPermissionCount = (permissions) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter(Boolean).length;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'מנהל': 'bg-red-100 text-red-800',
      'רכש': 'bg-blue-100 text-blue-800',
      'פרויקטים': 'bg-green-100 text-green-800',
      'חשבות': 'bg-yellow-100 text-yellow-800',
      'משאבי אנוש': 'bg-purple-100 text-purple-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">טוען משתמשים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">ניהול משתמשים</h1>
                  <p className="text-gray-600 mt-1">נהל משתמשים והרשאות במערכת</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                הוסף משתמש חדש
              </button>
            </div>
            
            {/* סטטיסטיקות */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold">{users.length}</div>
                <div className="text-blue-100">סה״כ משתמשים</div>
              </div>
              <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold">{users.filter(u => u.status === 'פעיל').length}</div>
                <div className="text-green-100">משתמשים פעילים</div>
              </div>
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl p-6 text-white">
                <div className="text-3xl font-bold">{users.filter(u => u.role === 'מנהל').length}</div>
                <div className="text-purple-100">מנהלים</div>
              </div>
            </div>
          </div>
        </div>

        {/* רשימת משתמשים */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">רשימת המשתמשים</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">משתמש</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תפקיד</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הרשאות</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {getPermissionCount(user.permissions)}/5 הרשאות
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.status === 'פעיל' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          user.status === 'פעיל' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        {user.status}
                      </button>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
                          title="עריכה"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">אין משתמשים במערכת</h3>
              <p className="text-gray-500">הוסף את המשתמש הראשון כדי להתחיל</p>
            </div>
          )}
        </div>

        {/* Modal טופס */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* פרטים אישיים */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      שם מלא *
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="הזן שם מלא"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      אימייל *
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user@company.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      טלפון
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="050-1234567"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      תפקיד *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">בחר תפקיד</option>
                      <option value="מנהל">מנהל</option>
                      <option value="רכש">רכש</option>
                      <option value="פרויקטים">פרויקטים</option>
                      <option value="חשבות">חשבות</option>
                      <option value="משאבי אנוש">משאבי אנוש</option>
                    </select>
                  </div>
                </div>

                {/* סיסמה */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    סיסמה {editingUser ? '(השאר ריק אם לא רוצה לשנות)' : '*'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="הזן סיסמה"
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* הרשאות */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">הרשאות במערכת</label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { key: 'projects', label: 'פרויקטים', icon: '📁' },
                        { key: 'invoices', label: 'חשבוניות', icon: '📄' },
                        { key: 'suppliers', label: 'ספקים', icon: '🏢' },
                        { key: 'orders', label: 'הזמנות', icon: '📦' },
                        { key: 'reports', label: 'דוחות', icon: '📊' }
                      ].map(permission => (
                        <label key={permission.key} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.permissions[permission.key]}
                            onChange={() => handlePermissionChange(permission.key)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-lg">{permission.icon}</span>
                          <span className="font-medium text-gray-700">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* כפתורים */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        שומר...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingUser ? 'עדכן משתמש' : 'צור משתמש'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;