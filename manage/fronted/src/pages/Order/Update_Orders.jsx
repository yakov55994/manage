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
  const [loading, setLoading] = useState(false);
  const { id } = useParams();  // Retrieve the order ID from the URL
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/orders/${id}`);
        setProjectName(response.data.projectName);
        setOrder(response.data);
        setOrderNumber(response.data.orderNumber);
        setSum(response.data.sum);
        setStatus(response.data.status);
        setDetail(response.data.detail);
        setInvitingName(response.data.invitingName);
        setContact_Person(response.data.Contact_person)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = {
        _id: id,
        orderNumber,
        sum: isNaN(Number(sum)) ? 0 : Number(sum),  // Ensure sum is a valid number
        status,
        detail,
        invitingName,
        projectName,
        Contact_person
      };

      const response = await api.put(`/orders/${id}`, formData);

      if (response.data) {
        navigate(`/order/${id}`); // Redirect to the order page after update
      }
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
                <input
                  type="number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="border p-3 text-sm rounded-lg w-44 mt-2"
                  disabled
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סכום :</label>
                <input
                  type="number"
                  value={sum}
                  onChange={(e) => setSum(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg text-sm w-44 mt-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">סטטוס :</label>
                <select
                  onChange={(e) => setStatus(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg bg-slate-300 text-black font-bold mt-2 w-44"
                  value={status}
                >
                  <option value="הוגש" className="font-bold text-sm">הוגש</option>
                  <option value="בעיבוד" className="font-bold text-sm">בעיבוד</option>
                  <option value="לא הוגש" className="font-bold text-sm">לא הוגש</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black">שם מזמין :</label>
                <input
                  type="text"
                  value={invitingName}
                  onChange={(e) => setInvitingName(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg w-44 mt-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black mb-5">פרויקט :</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg w-44 mt-2"
                />
              </div>

              <div className="flex flex-col">
                <label className="font-bold text-xl text-black ">איש קשר :</label>
                <input
                  type="text"
                  value={Contact_person}
                  onChange={(e) => setContact_Person(e.target.value)}
                  className="bg-slate-300 border p-3 rounded-lg w-44 mt-2"
                />
              </div>
            </div>

            <div className="mt-7 w-96">
              <label className="font-bold text-l text-black">פירוט :</label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="border-2 bg-slate-300 border-gray-900 p-3 rounded-lg w-full min-h-[100px] h-32 mt-6 px-3 py-2.5"
              />
            </div>

            <button
              type="submit"
              className="bg-slate-900 text-white px-6 py-2 rounded-lg mt-5 font-bold w-28 hover:bg-slate-700"
            >
              עדכן
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrderEditPage;
