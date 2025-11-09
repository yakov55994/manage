import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';
import {
  Building2,
  DollarSign,
  User,
  Phone,
  TrendingUp,
  Sparkles,
  Save,
  ArrowRight,
  Truck,
  CreditCard,
  FileText,
  CheckCircle2,
} from 'lucide-react';

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

  const [supplierName, setSupplierName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [missingDocument, setMissingDocument] = useState('');

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
        supplierName,
        paymentStatus,
        missingDocument,
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col justify-center items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 blur-3xl opacity-20 animate-pulse"></div>
          <ClipLoader size={100} color="#f97316" loading />
        </div>
        <h1 className="mt-8 font-bold text-3xl text-slate-900">טוען פרטי פרויקט...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-4xl">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-5 blur-xl"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 p-8 border border-white/50">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-black text-slate-900">עריכת פרויקט</h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      {project?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => navigate(`/project/${id}`)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 font-bold rounded-xl hover:from-slate-300 hover:to-slate-400 transition-all shadow-lg"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזור לפרטי הפרויקט</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-3xl opacity-10 blur-xl"></div>

          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
              <div className="bg-white/95 backdrop-blur-xl p-6">
                <h2 className="text-2xl font-bold text-slate-900 text-center">פרטי הפרויקט</h2>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Name */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    שם הפרויקט <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="הזן שם פרויקט..."
                    required
                  />
                </div>

                {/* Budget */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 text-orange-500" />
                    תקציב <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value === '' ? 0 : e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="0"
                    required
                  />
                </div>

                {/* Remaining Budget */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    תקציב שנותר
                  </label>
                  <input
                    type="number"
                    value={remainingBudget}
                    onChange={(e) => setRemainingBudget(e.target.value === '' ? 0 : e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl bg-slate-50 font-medium cursor-not-allowed"
                    disabled
                  />
                </div>

                {/* Inviting Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <User className="w-4 h-4 text-orange-500" />
                    שם המזמין <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invitingName}
                    onChange={(e) => setInvitingName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="הזן שם מזמין..."
                    required
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Phone className="w-4 h-4 text-orange-500" />
                    איש קשר <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={Contact_person}
                    onChange={(e) => setContact_Person(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="הזן שם איש קשר..."
                    required
                  />
                </div>

                {/* Supplier Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Truck className="w-4 h-4 text-orange-500" />
                    שם הספק
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="לדוגמה: חברת בנייה בע״מ"
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    מצב תשלום
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="">— בחר —</option>
                    <option value="שולם">שולם</option>
                    <option value="לא שולם">לא שולם</option>
                  </select>
                </div>

                {/* Missing Document */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    חוסר מסמך
                  </label>
                  <select
                    value={missingDocument}
                    onChange={(e) => setMissingDocument(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl bg-white font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="">— בחר —</option>
                    <option value="כן">כן</option>
                    <option value="לא">לא</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-lg rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-xl shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <ClipLoader size={20} color="#ffffff" />
                      <span>שומר...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>שמור שינויים</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Animation */}
        {showAnimation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-30 blur-2xl animate-pulse"></div>
              
              <div className="relative bg-white rounded-full p-8 shadow-2xl">
                <CheckCircle2 className="w-24 h-24 text-emerald-500 animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateProjectPage;