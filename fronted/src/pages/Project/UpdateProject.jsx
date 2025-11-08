import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

const UpdateProjectPage = () => {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [budget, setBudget] = useState('');
  const [invitingName, setInvitingName] = useState('');
  const [remainingBudget, setRemainingBudget] = useState('');
  const [Contact_person, setContact_Person] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  // ✅ שדות חדשים ברמת פרויקט
  const [supplierName, setSupplierName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');      // "", "שולם", "לא שולם"
  const [missingDocument, setMissingDocument] = useState('');  // "", "כן", "לא"

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data } = await api.get(`/projects/${id}`);
        setProject(data);
        setNewProjectName(data.name || '');
        setBudget(data.budget ?? 0);
        setInvitingName(data.invitingName || '');
        setRemainingBudget(data.remainingBudget ?? 0);
        setContact_Person(data.Contact_person || '');

        // ✅ טעינת השדות החדשים
        setSupplierName(data.supplierName ?? '');
        setPaymentStatus(data.paymentStatus ?? '');
        setMissingDocument(data.missingDocument ?? '');

        setLoading(false);
      } catch (error) {
        toast.error('שגיאה בשליפת פרויקט', { className: 'sonner-toast error rtl' });
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // ולידציה בסיסית לשדות חובה הישנים (החדשים אופציונליים לפי הבקשה)
    if (
      !newProjectName ||
      !invitingName ||
      budget === undefined || budget === null || budget === '' || isNaN(budget) ||
      remainingBudget === undefined || remainingBudget === null || remainingBudget === '' || isNaN(remainingBudget) ||
      !Contact_person
    ) {
      toast.error('לצורך עדכון פרוייקט נדרש למלא את כל השדות עם ערכים תקינים', {
        className: 'sonner-toast error rtl',
      });
      setLoading(false);
      return;
    }

    try {
      await api.put(`/projects/${id}`, {
        name: newProjectName,
        budget: Number(budget),
        invitingName,
        remainingBudget: Number(remainingBudget),
        Contact_person,

        // ✅ שליחת השדות החדשים
        supplierName,
        paymentStatus,     // "", "שולם", "לא שולם"
        missingDocument,   // "", "כן", "לא"
      });

      toast.success('הפרוייקט עודכן בהצלחה!', { className: 'sonner-toast success rtl' });
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
        navigate(`/project/${id}`);
      }, 1500);
    } catch (err) {
      toast.error('נכשל ביצוע העדכון', { className: 'sonner-toast error rtl' });
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
      <h1 className="text-4xl font-bold text-center text-slate-700 mb-6">עריכת פרוייקט</h1>

      <div className="flex justify-center items-center min-h-screen">
        <form className="bg-gray-300 p-8 rounded-lg shadow-xl max-w-md w-full font-bold" onSubmit={handleSubmit}>
          {/* שם פרויקט */}
          <div className="mb-5">
            <label htmlFor="newProjectName" className="block text-lg">שם פרויקט חדש</label>
            <input
              type="text"
              id="newProjectName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2 font-bold"
              required
            />
          </div>

          {/* תקציב */}
          <div className="mb-5">
            <label htmlFor="budget" className="block text-lg">תקציב</label>
            <input
              type="number"
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value === '' ? 0 : e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />
          </div>

          {/* שם המזמין + איש קשר */}
          <div className="mb-5">
            <label htmlFor="invitingName" className="block text-lg">שם המזמין</label>
            <input
              type="text"
              id="invitingName"
              value={invitingName}
              onChange={(e) => setInvitingName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />

            <label htmlFor="Contact_person" className="block text-lg mt-4">איש קשר</label>
            <input
              type="text"
              id="Contact_person"
              value={Contact_person}
              onChange={(e) => setContact_Person(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />
          </div>

          {/* תקציב שנותר */}
          <div className="mb-5">
            <label htmlFor="remainingBudget" className="block text-lg">תקציב שנותר</label>
            <input
              type="number"
              id="remainingBudget"
              value={remainingBudget}
              onChange={(e) => setRemainingBudget(e.target.value === '' ? 0 : e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              disabled
            />
          </div>

          {/* ✅ שדות חדשים ברמת פרויקט */}
          <div className="mb-5">
            <label htmlFor="supplierName" className="block text-lg">שם ספק </label>
            <input
              type="text"
              id="supplierName"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              placeholder="לדוגמה: חברת בנייה בע״מ"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="paymentStatus" className="block text-lg">מצב תשלום </label>
            <select
              id="paymentStatus"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2 bg-white"
            >
              <option value="">— בחר —</option>
              <option value="שולם">שולם</option>
              <option value="לא שולם">לא שולם</option>
            </select>
          </div>

          <div className="mb-5">
            <label htmlFor="missingDocument" className="block text-lg">חוסר מסמך </label>
            <select
              id="missingDocument"
              value={missingDocument}
              onChange={(e) => setMissingDocument(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2 bg-white"
            >
              <option value="">— בחר —</option>
              <option value="כן">כן</option>
              <option value="לא">לא</option>
            </select>
          </div>

          <div className="grid place-items-center mt-4">
            <button
              type="submit"
              className="w-36 py-3 bg-slate-800 text-white text-lg font-bold rounded-lg hover:bg-slate-600"
              disabled={loading}
            >
              {loading ? 'טוען...' : 'שמור'}
            </button>
          </div>
        </form>
      </div>

      {showAnimation && null /* SuccessAnimation אם תרצה להחזיר */}
    </div>
  );
};

export default UpdateProjectPage;
