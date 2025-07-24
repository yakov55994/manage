import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessAnimation from '../../Components/SuccessAnimation.jsx';
import api from '../../api/api';
import FileUploader from '../../Components/FileUploader';
import { toast } from 'sonner';

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
          className: "sonner-toast error rtl"
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
        className: "sonner-toast error rtl"
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
        file: null,
        Contact_person: ""
      }
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

  const handleOrderUpload = (index, uploadedFiles) => {
    console.log("Files received in handleOrderUpload:", uploadedFiles);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      toast.info('לא נבחר קובץ', { className: "sonner-toast info rtl" });
      return;
    }

    const newOrders = [...orders];

    // Initialize files array if it doesn't exist
    if (!newOrders[index].files) {
      newOrders[index].files = [];
    }

    // Add new files to the order's files array, avoid duplicates
    const updatedFiles = [
      ...newOrders[index].files,
      ...uploadedFiles.filter(file => !newOrders[index].files.some(f => f.name === file.name))
    ];

    newOrders[index] = {
      ...newOrders[index],
      files: updatedFiles
    };

    setOrders(newOrders);
  };
  const validateOrder = (order) => {
    const requiredFields = ['orderNumber', 'detail', 'sum', 'status', 'invitingName', 'Contact_person'];
    return requiredFields.every(field => !!order[field]);
  };

  const validateSubmission = () => {
    if (!selectedProject) {
      toast.info('יש לבחור פרויקט תחילה', {
        className: "sonner-toast info rtl"
      });
      return false;
    }

    if (orders.length === 0) {
      toast.info('יש להוסיף לפחות הזמנה אחת', {
        className: "sonner-toast info rtl"
      });
      return false;
    }

    if (!orders.every(validateOrder)) {
      toast.info('יש למלא את כל השדות בכל ההזמנות', {
        className: "sonner-toast error rtl"
      });
      return false;
    }

    // בדיקת שמות כפולים
    const invitingNames = orders.map(order => order.invitingName);
    const duplicates = invitingNames.filter((name, index) =>
      invitingNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      toast.error(`שם מזמין "${duplicates[0]}" מופיע יותר מפעם אחת`, {
        className: "sonner-toast error rtl"
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
      // הכנת נתוני ההזמנות
      const orderData = orders.map((order) => ({
        orderNumber: order.orderNumber,
        projectName: selectedProject.name,
        projectId: selectedProject._id,
        sum: Number(order.sum),
        status: order.status,
        invitingName: order.invitingName,
        detail: order.detail,
        files: order.files && order.files.length > 0
          ? order.files.map(file => ({
            _id: file._id,
            name: file.name || '',
            url: file.url || '',
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
            folder: file.folder
          }))
          : [],
          Contact_person: order.Contact_person
      }));

      // יצירת ההזמנה
      const response = await api.post(
        '/orders',
        { orders: orderData },
        { headers: { 'Content-Type': 'application/json' } }
      );

      toast.success('ההזמנה/ות נוצרו בהצלחה!', {
        className: "sonner-toast success rtl"
      });
      navigate('/orders');

      // כעת נבצע את העלאת הקבצים ל-Cloudinary עבור כל הזמנה
      // ניקוי נתוני ההזמנות
      setOrders([]);

    } catch (err) {
      console.error(err);  // הוסף את זה כדי לראות את כל פרטי השגיאה בקונסול
      const errorMessage = err.response?.data?.error;
      toast.error(errorMessage, {
        className: "sonner-toast error rtl"
      });
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
    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    window.open(officeUrl, "_blank");
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;

    if (!fileUrl) return null;

    const fileExtension = fileUrl.split('.').pop().toLowerCase();

    // בדיקה אם הקובץ הוא XLSX
    if (fileExtension === 'xlsx') {
      return (
        <div>
          <button
            onClick={() => openInExcelViewer(fileUrl)}
            className="text-blue-500 font-bold mt-2"
          >
            📂 לצפייה בקובץ לחץ כאן

          </button>
        </div>
      );
    }

    // אם הקובץ הוא PDF
    if (fileExtension === 'pdf') {
      return (
        <div>
          {/* <embed src={fileUrl} type="application/pdf" width="100%" height="600px" /> */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
            📂 לצפייה בקובץ לחץ כאן

          </a>
        </div>
      );
    }

    // אם הקובץ הוא תמונה
    if (fileUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
      return (
        <div>
          {/* <img src={fileUrl} alt="Invoice File" className="w-full max-w-lg mx-auto rounded-lg shadow-md" /> */}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
            📂 לצפייה בקובץ לחץ כאן

          </a>
        </div>
      );
    }

    // אם הקובץ הוא סוג אחר
    return (
      <div>
        {/* <iframe src={fileUrl} className="w-full max-w-lg h-96 mx-auto" title="Document Preview"></iframe> */}
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-500 font-bold mt-2">
          📂 לצפייה בקובץ לחץ כאן

        </a>
      </div>
    );
  };

  return (
    <div className="mt-10 bg-gray-300 p-8 rounded-lg shadow-xl w-full max-w-5xl">
      <h1 className="text-4xl font-bold text-center text-slate-800 mb-8 drop-shadow-lg">
        יצירת הזמנה / הזמנות לפרוייקט
      </h1>

      <div className="mb-8 flex justify-center">
        <select
          onChange={handleProjectChange}
          className="mt-5 w-64 p-3 border border-gray-300 rounded-lg bg-slate-400 text-black font-bold"
        >
          <option value="" className="font-bold">לא נבחר פרוייקט</option>
          {projects.map((project) => (
            <option key={project._id} value={project._id} className="font-bold text-black">
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {orders.map((order, index) => (
        <div key={index} className="bg-white p-6 rounded-xl shadow-xl mb-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">שם המזמין:</label>
              <input
                type="text"
                value={order.invitingName}
                onChange={(e) => handleOrderChange(index, 'invitingName', e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">מספר הזמנה:</label>
              <input
                type="number"
                value={order.orderNumber}
                onChange={(e) => handleOrderChange(index, 'orderNumber', e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">סכום ההזמנה:</label>
              <input
                type="number"
                value={order.sum}
                onChange={(e) => handleOrderChange(index, 'sum', e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-slate-700 font-semibold">פירוט הזמנה:</label>
              <textarea
                value={order.detail}
                onChange={(e) => handleOrderChange(index, 'detail', e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all h-24"
                required
              />
            </div>

  <div className="space-y-2">
          <label className="block text-slate-700 font-semibold">
            איש קשר:
          </label>
          <input
            type="text"
            value={order.Contact_person} // ✅ הערך של החשבונית הספציפית
            onChange={(e) =>
              handleOrderChange(index, "Contact_person", e.target.value)
            }
            placeholder="הכנס שם איש הקשר"
            className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all"
            required
          />
        </div> 

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">סטטוס:</label>
              <select
                value={order.status}
                onChange={(e) => handleOrderChange(index, 'status', e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 transition-all bg-white"
                required
              >
                <option value="לא הוגש">לא הוגש</option>
                <option value="הוגש">הוגש</option>
                <option value="בעיבוד">בעיבוד</option>
              </select>
            </div>
                  
            <div className="space-y-2 lg:col-span-3">
              <FileUploader
                onUploadSuccess={(files) => handleOrderUpload(index, files)}
                folder="invoices"
                label="העלה קבצי הזמנה"
              />

              {/* Display uploaded files */}
              <div className="col-span-3">
                {order.files && order.files.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {order.files.map((file, index) => (
                      <div key={index} className="text-center flex items-center justify-center">
                        <p className="font-bold text-xl mr-2 ml-5">קובץ {index + 1} :</p>
                        {renderFile(file)} {/* הצגת הקובץ */}
                        <button
                          onClick={() => handleRemoveFile(index, order.file)}
                          className='text-xl font-bold mr-6 mt-2'
                        >
                          ❌ הסר
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <p className="text-gray-700 bg-white w-44 p-2 mt-10 text-center text-lg rounded-2xl">אין קבצים להצגה</p>
                  </div>
                )}

              </div>

            </div>
          </div>

          <button
            onClick={() => removeOrder(index)}
            className="mt-6 px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <span>מחק הזמנה זו מהרשימה</span>
            <span>❌</span>
          </button>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row justify-center gap-4 items-center mt-8">
        <button
          onClick={addOrder}
          className="w-48 py-3 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <span>הוסף הזמנה לרשימה</span>
          <span>➕</span>
        </button>

        <button
          onClick={handleSubmit}
          className="w-48 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading || !selectedProject || orders.length === 0}
        >
          {isLoading ? 'יוצר אנא המתן...' : 'צור הזמנה/ות'}
        </button>
      </div>



      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="mb-6">
              <h3 className="text-3xl font-bold text-center text-red-600">האם אתה בטוח?</h3>
              <p className="mt-1 text-l text-center">שים לב! פעולה זו תמחק את הזמנה לצמיתות.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition">
                מחק
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-150">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default CreateOrder;