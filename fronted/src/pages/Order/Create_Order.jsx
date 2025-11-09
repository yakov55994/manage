import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import FileUploader from '../../Components/FileUploader';
import { toast } from 'sonner';
import {
  ShoppingCart,
  FileText,
  Building2,
  User,
  Calendar,
  Upload,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Phone,
} from 'lucide-react';

const CreateOrder = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderIndexToDelete, setOrderIndexToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects');
        setProjects(response.data || []);
      } catch (err) {
        toast.error('שגיאה בהבאת הפרויקטים', {
          className: 'sonner-toast error rtl',
        });
      }
    };
    fetchProjects();
  }, []);

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    const selected = projects.find((project) => project._id === projectId);
    setSelectedProject(selected);
  };

  const addOrder = () => {
    if (!selectedProject) {
      toast.error('יש לבחור פרוייקט קודם', {
        className: 'sonner-toast error rtl',
      });
      return;
    }
    setOrders([
      ...orders,
      {
        projectName: selectedProject?.name || '',
        orderNumber: '',
        detail: '',
        sum: '',
        status: 'לא הוגש',
        invitingName: '',
        files: [],
        Contact_person: '',
        createdAt: '',
      },
    ]);
  };

  const removeOrder = (index) => {
    setOrderIndexToDelete(index);
    setShowModal(true);
  };

  const handleDelete = () => {
    setOrders(orders.filter((_, i) => i !== orderIndexToDelete));
    setShowModal(false);
  };

  const handleOrderChange = (index, field, value) => {
    const newOrders = [...orders];
    newOrders[index][field] = value;
    setOrders(newOrders);
  };

  const handleOrderUpload = (index, selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.info('לא נבחרו קבצים', { className: 'sonner-toast info rtl' });
      return;
    }

    const newOrders = [...orders];

    if (!newOrders[index].files) {
      newOrders[index].files = [];
    }

    const updatedFiles = [
      ...newOrders[index].files,
      ...selectedFiles.filter(
        (file) => !newOrders[index].files.some((f) => f.name === file.name)
      ),
    ];

    newOrders[index] = {
      ...newOrders[index],
      files: updatedFiles,
    };

    setOrders(newOrders);

    toast.success(`${selectedFiles.length} קבצים נבחרו (יועלו בעת השמירה)`, {
      className: 'sonner-toast success rtl',
    });
  };

  const validateSubmission = () => {
    if (!selectedProject) {
      toast.error('יש לבחור פרויקט תחילה', {
        className: 'sonner-toast error rtl',
      });
      return false;
    }

    if (orders.length === 0) {
      toast.error('יש להוסיף לפחות הזמנה אחת', {
        className: 'sonner-toast error rtl',
      });
      return false;
    }

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderNumber = i + 1;

      if (!order.orderNumber) {
        toast.error(`הזמנה מספר ${orderNumber}: חסר מספר הזמנה`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }

      if (!order.invitingName || order.invitingName.trim() === '') {
        toast.error(`הזמנה מספר ${orderNumber}: חסר שם המזמין`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }

      if (!order.sum || order.sum <= 0) {
        toast.error(
          `הזמנה מספר ${orderNumber}: חסר סכום או שהסכום לא תקין`,
          {
            className: 'sonner-toast error rtl',
          }
        );
        return false;
      }

      if (!order.detail || order.detail.trim() === '') {
        toast.error(`הזמנה מספר ${orderNumber}: חסר פירוט ההזמנה`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }

      if (!order.Contact_person || order.Contact_person.trim() === '') {
        toast.error(`הזמנה מספר ${orderNumber}: חסר איש קשר`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }

      if (!order.status) {
        toast.error(`הזמנה מספר ${orderNumber}: חסר סטטוס ההזמנה`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }

      if (!order.createdAt) {
        toast.error(`הזמנה מספר ${orderNumber}: חסר תאריך יצירת ההזמנה`, {
          className: 'sonner-toast error rtl',
        });
        return false;
      }
    }

    const invitingNames = orders.map((order) => order.invitingName.trim());
    const duplicates = invitingNames.filter(
      (name, index) => invitingNames.indexOf(name) !== index
    );

    if (duplicates.length > 0) {
      toast.error(`שם מזמין "${duplicates[0]}" מופיע יותר מפעם אחת`, {
        className: 'sonner-toast error rtl',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateSubmission()) {
      return;
    }

    setIsLoading(true);
    try {
      const orderData = await Promise.all(
        orders.map(async (order) => {
          let uploadedFiles = [];

          if (order.files && order.files.length > 0) {
            for (const fileData of order.files) {
              if (fileData.isLocal && fileData.file) {
                try {
                  const formData = new FormData();
                  formData.append('file', fileData.file);
                  formData.append('folder', fileData.folder || 'orders');

                  const uploadResponse = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });

                  uploadedFiles.push({
                    name: fileData.name,
                    url: uploadResponse.data.file.url,
                    type: fileData.type,
                    size: fileData.size,
                    publicId: uploadResponse.data.file.publicId,
                    resourceType: uploadResponse.data.file.resourceType,
                  });
                } catch (uploadError) {
                  toast.error(`שגיאה בהעלאת ${fileData.name}`, {
                    className: 'sonner-toast error rtl',
                  });
                  throw uploadError;
                }
              } else {
                uploadedFiles.push(fileData);
              }
            }
          }

          return {
            orderNumber: order.orderNumber,
            projectName: selectedProject.name,
            projectId: selectedProject._id,
            sum: Number(order.sum),
            status: order.status,
            invitingName: order.invitingName,
            detail: order.detail,
            files: uploadedFiles,
            Contact_person: order.Contact_person,
            createdAt: order.createdAt,
          };
        })
      );

      const response = await api.post(
        '/orders',
        { orders: orderData },
        { headers: { 'Content-Type': 'application/json' } }
      );

      toast.success('ההזמנה/ות נוצרו בהצלחה!', {
        className: 'sonner-toast success rtl',
      });
      navigate('/orders');
      setOrders([]);
    } catch (err) {
      console.error('שגיאה במהלך יצירת ההזמנה/ות:', err);
      if (err.response?.data?.message) {
        toast.error(`שגיאה: ${err.response.data.message}`, {
          className: 'sonner-toast error rtl',
        });
      } else {
        toast.error('שגיאה ביצירת ההזמנה - אנא נסה שוב', {
          className: 'sonner-toast error rtl',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = (orderIndex, fileIndex) => {
    const newOrders = [...orders];
    newOrders[orderIndex].files.splice(fileIndex, 1);
    setOrders(newOrders);
  };

  const openInExcelViewer = (fileUrl) => {
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      fileUrl
    )}`;
    window.open(officeUrl, '_blank');
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    const isLocal = file?.isLocal || false;

    if (!fileUrl) return null;

    if (isLocal) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
          <span className="text-orange-500 text-xs font-bold">
            (יועלה בשמירה)
          </span>
        </div>
      );
    }

    const fileExtension = fileUrl.split('.').pop().toLowerCase();

    if (fileExtension === 'xlsx') {
      return (
        <button
          onClick={() => openInExcelViewer(fileUrl)}
          className="text-blue-500 font-bold hover:underline"
        >
          📂 לצפייה בקובץ לחץ כאן
        </button>
      );
    }

    if (fileExtension === 'pdf' || fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 font-bold hover:underline"
        >
          📂 לצפייה בקובץ לחץ כאן
        </a>
      );
    }

    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 font-bold hover:underline"
      >
        📂 לצפייה בקובץ לחץ כאן
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">
                    יצירת הזמנות לפרויקט
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      מערכת ניהול הזמנות מתקדמת
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Selector */}
              <div className="max-w-md mx-auto mt-6">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  בחר פרויקט
                </label>
                <select
                  onChange={handleProjectChange}
                  className="w-full p-4 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                >
                  <option value="">לא נבחר פרוייקט</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.map((order, index) => (
            <div key={index} className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
                  <div className="bg-white/95 backdrop-blur-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                          <ShoppingCart className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          הזמנה מספר {index + 1}
                        </h3>
                      </div>
                      <button
                        onClick={() => removeOrder(index)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>מחק</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Form */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Inviting Name */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-500" />
                        שם המזמין
                      </label>
                      <input
                        type="text"
                        value={order.invitingName}
                        onChange={(e) =>
                          handleOrderChange(index, 'invitingName', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הזן שם מזמין..."
                        required
                      />
                    </div>

                    {/* Order Number */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        מספר הזמנה
                      </label>
                      <input
                        type="number"
                        value={order.orderNumber}
                        onChange={(e) =>
                          handleOrderChange(index, 'orderNumber', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      />
                    </div>

                    {/* Sum */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        סכום ההזמנה
                      </label>
                      <input
                        type="number"
                        value={order.sum}
                        onChange={(e) =>
                          handleOrderChange(index, 'sum', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      />
                    </div>

                    {/* Detail */}
                    <div className="md:col-span-2 lg:col-span-3 group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        פירוט הזמנה
                      </label>
                      <textarea
                        value={order.detail}
                        onChange={(e) =>
                          handleOrderChange(index, 'detail', e.target.value)
                        }
                        className="mt-2 w-full min-h-[100px] rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all resize-none group-hover:border-orange-300"
                        placeholder="הוסף פירוט על ההזמנה..."
                        required
                      />
                    </div>

                    {/* Created At */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        תאריך יצירת ההזמנה
                      </label>
                      <input
                        type="date"
                        value={order.createdAt}
                        onChange={(e) =>
                          handleOrderChange(index, 'createdAt', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                        onFocus={(e) => e.target.showPicker()}
                      />
                    </div>

                    {/* Contact Person */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-orange-500" />
                        איש קשר
                      </label>
                      <input
                        type="text"
                        value={order.Contact_person}
                        onChange={(e) =>
                          handleOrderChange(index, 'Contact_person', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        placeholder="הכנס שם איש הקשר..."
                        required
                      />
                    </div>

                    {/* Status */}
                    <div className="group">
                      <label className="text-sm font-bold text-slate-700 mb-2 block">
                        סטטוס
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleOrderChange(index, 'status', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                        required
                      >
                        <option value="לא הוגש">לא הוגש</option>
                        <option value="הוגש">הוגש</option>
                        <option value="בעיבוד">בעיבוד</option>
                      </select>
                    </div>

                    {/* File Uploader */}
                    <div className="lg:col-span-3">
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 hover:border-orange-400 transition-all">
                        <FileUploader
                          onUploadSuccess={(files) =>
                            handleOrderUpload(index, files)
                          }
                          folder="orders"
                          label="העלה קבצי הזמנה"
                        />
                      </div>

                      {/* Display Files */}
                      {order.files && order.files.length > 0 ? (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {order.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 hover:border-orange-400 hover:shadow-lg transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1 truncate">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="truncate">{renderFile(file)}</div>
                              </div>
                              <button
                                onClick={() => handleRemoveFile(index, fileIndex)}
                                className="mr-2 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium transition-all"
                              >
                                הסר
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-center py-8 text-slate-400">
                          <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">
                            אין קבצים מצורפים כרגע
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={addOrder}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3"
            type="button"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>הוסף הזמנה</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedProject || orders.length === 0}
            className="group px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all flex items-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>יוצר אנא המתן...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>צור הזמנה/ות</span>
              </>
            )}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl opacity-20 blur-2xl"></div>

              <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    האם אתה בטוח?
                  </h3>
                  <p className="text-slate-600">
                    שים לב! פעולה זו תמחק את ההזמנה לצמיתות.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transition-all shadow-lg"
                  >
                    מחק
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
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

export default CreateOrder;