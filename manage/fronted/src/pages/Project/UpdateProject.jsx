import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api'; import { ClipLoader } from 'react-spinners';
// import SuccessAnimation from '../../Components/SuccessAnimation.jsx';
import { toast } from 'sonner';

const UpdateProjectPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [budget, setBudget] = useState('');
  const [invitingName, setInvitingName] = useState('');
  const [remainingBudget, setRemainingBudget] = useState('');
  const [Contact_person, setContact_Person] = useState(true);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get(`/projects/${id}`);
        setProject(response.data);
        setNewProjectName(response.data.name || '');
        setBudget(response.data.budget ?? 0);
        setInvitingName(response.data.invitingName || '');
        setRemainingBudget(response.data.remainingBudget ?? 0);
        setContact_Person(response.data.Contact_person || '');
        setLoading(false);
      } catch (error) {
        toast.error('שגיאה בשליפת פרויקט',{
          className: "sonner-toast error rtl"
        }
        );
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (
      !newProjectName ||
      !invitingName ||
      budget === undefined || budget === null || budget === "" || isNaN(budget) ||
      remainingBudget === undefined || remainingBudget === null || remainingBudget === "" || isNaN(remainingBudget || !! Contact_person)
    ) {
      toast.error('לצורך עדכון פרוייקט נדרש למלא את כל השדות עם ערכים תקינים', {
        className: "sonner-toast error rtl"
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
        Contact_person: Contact_person
      });
      setSuccess('הפרוייקט עודכן בהצלחה!');
      setShowAnimation(true);

      setTimeout(() => {
        setShowAnimation(false);
        navigate(`/project/${id}`);
      }, 5000);
    } catch (err) {
      toast.error('נכשל ביצוע העדכון', {
        className: "sonner-toast error rtl"
      });
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
          <div className="mb-5 font-bold">
            <label htmlFor="newProjectName" className="block text-lg">
              שם פרויקט חדש
            </label>
            <input
              type="text"
              id="newProjectName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2 font-bold"
              required
            />
          </div>
          <div className="mb-5 font-bold">
            <label htmlFor="budget" className="block text-lg">תקציב</label>
            <input
              type="text"
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value === '' ? 0 : e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />
          </div>
          <div className="mb-5 font-bold">
            <label htmlFor="invitingName" className="block text-lg">שם המזמין</label>
            <input
              type="text"
              id="invitingName"
              value={invitingName}
              onChange={(e) => setInvitingName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />
            <label htmlFor="Contact_person" className="block text-lg">איש קשר</label>
            <input
              type="text"
              id="Contact_person"
              value={Contact_person}
              onChange={(e) => setContact_Person(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              required
            />
          </div>
          <div className="mb-5 font-bold">
            <label htmlFor="remainingBudget" className="block text-lg">
              תקציב שנותר
            </label>
            <input
              type="text"
              id="remainingBudget"
              value={remainingBudget}
              onChange={(e) => setRemainingBudget(e.target.value === '' ? 0 : e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              disabled
            />
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


      {showAnimation && <SuccessAnimation text={success} />}
    </div>
  );
};

export default UpdateProjectPage;
