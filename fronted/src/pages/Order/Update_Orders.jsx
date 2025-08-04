import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

const OrderEditPage = () => {
  const [projectName, setProjectName] = useState('');
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState('');
  const [invitingName, setInvitingName] = useState('');
  const [Contact_person, setContact_Person] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [sum, setSum] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/orders/${id}`);
        const data = response.data;
        setProjectName(data.projectName);
        setOrder(data);
        setOrderNumber(data.orderNumber);
        setSum(data.sum);
        setStatus(data.status);
        setDetail(data.detail);
        setInvitingName(data.invitingName);
        setContact_Person(data.Contact_person);
        setFiles(data.files || []);
      } catch (error) {
        toast.error('שגיאה בטעינת פרטי הזמנה', {
          className: "sonner-toast error rtl"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleFileUpload = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = [
      ...files,
      ...Array.from(selectedFiles).filter(file =>
        !files.some(f => f.name === file.name)
      ).map(file => ({
        name: file.name,
        file,
        isLocal: true
      }))
    ];

    setFiles(newFiles);
    toast.success(`${selectedFiles.length} קבצים נוספו`, {
      className: "sonner-toast success rtl"
    });
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const renderFile = (file) => {
    const fileUrl = file?.url || file?.fileUrl;
    const fileName = file.name || (fileUrl && fileUrl.split('/').pop());

    if (!fileUrl && file?.file) {
      return <span>{file.name}</span>;
    }

    const ext = fileUrl?.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
      return <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📄 {fileName}</a>;
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">🖼️ {fileName}</a>;
    }

    if (ext === 'xlsx') {
      const viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
      return <a href={viewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📊 {fileName}</a>;
    }

    return <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">📁 {fileName}</a>;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedFiles = [];

      for (const file of files) {
        if (file.isLocal && file.file) {
          const formData = new FormData();
          formData.append("file", file.file);
          formData.append("folder", "orders");

          const res = await api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          uploadedFiles.push({
            name: file.name,
            url: res.data.file.url,
            publicId: res.data.file.publicId,
            resourceType: res.data.file.resourceType,
            size: file.file.size,
            type: file.file.type
          });
        } else {
          uploadedFiles.push(file); // שמור קבצים שכבר קיימים
        }
      }

      const formData = {
        _id: id,
        orderNumber,
        sum: isNaN(Number(sum)) ? 0 : Number(sum),
        status,
        detail,
        invitingName,
        projectName,
        Contact_person,
        files: uploadedFiles
      };

      await api.put(`/orders/${id}`, formData);
      toast.success("הזמנה עודכנה בהצלחה", {
        className: "sonner-toast success rtl"
      });
      navigate(`/order/${id}`);
    } catch (error) {
      toast.error(error.message, {
        className: "sonner-toast error rtl"
      });
    } finally {
      setLoading(false);
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
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold text-center text-slate-700 mb-20">עריכת הזמנה</h1>

      {order && (
        <div className="flex justify-center items-center min-h-screen">
          <form onSubmit={handleSubmit} className="bg-slate-400 w-full max-w-4xl rounded-xl font-bold p-6 shadow-lg">
            <div className="flex flex-wrap justify-between gap-4">
              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">מספר הזמנה :</label>
                <input type="number" value={orderNumber} className="border p-3 text-sm rounded-lg w-44 mt-2" disabled />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סכום :</label>
                <input type="number" value={sum} onChange={(e) => setSum(e.target.value)} className="bg-slate-300 border p-3 rounded-lg text-sm w-44 mt-2" />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סטטוס :</label>
                <select onChange={(e) => setStatus(e.target.value)} value={status} className="p-3 border border-gray-300 rounded-lg bg-slate-300 text-black font-bold mt-2 w-44">
                  <option value="הוגש">הוגש</option>
                  <option value="בעיבוד">בעיבוד</option>
                  <option value="לא הוגש">לא הוגש</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">שם מזמין :</label>
                <input type="text" value={invitingName} onChange={(e) => setInvitingName(e.target.value)} className="bg-slate-300 border p-3 rounded-lg w-44 mt-2" />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">פרויקט :</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-slate-300 border p-3 rounded-lg w-44 mt-2" />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">איש קשר :</label>
                <input type="text" value={Contact_person} onChange={(e) => setContact_Person(e.target.value)} className="bg-slate-300 border p-3 rounded-lg w-44 mt-2" />
              </div>
            </div>

            <div className="mt-6">
              <label className="font-bold text-l text-black">פירוט :</label>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} className="border-2 bg-slate-300 border-gray-900 p-3 rounded-lg w-full min-h-[100px] h-32 mt-6" />
            </div>

            <div className="mt-6">
              <label className="font-bold text-l text-black">העלה קבצים נוספים:</label>
              <input type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} className="mt-2 p-2 border rounded-lg bg-white" />
            </div>

            <div className="mt-6">
              <label className="font-bold text-l text-black">קבצים מצורפים:</label>
              <div className="space-y-3 mt-3">
                {files.length > 0 ? files.map((file, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="font-semibold">📎 קובץ {index + 1}:</span>
                    {renderFile(file)}
                    <button type="button" onClick={() => handleRemoveFile(index)} className="text-red-600 font-bold hover:underline">הסר ❌</button>
                  </div>
                )) : (
                  <p className="text-gray-700">אין קבצים מוצגים</p>
                )}
              </div>
            </div>

            <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg mt-6 font-bold w-32 hover:bg-slate-700">
              עדכן
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrderEditPage;
