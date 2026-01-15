import { useState } from "react";
import api from "../../api/api.js";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { validateForm, showValidationErrors } from "../../utils/validation.jsx";
import {
  FolderPlus,
  Building2,
  User,
  Phone,
  Sparkles,
  Save,
  ArrowRight,
} from "lucide-react";

const CreateProject = () => {
  const [name, setName] = useState("");
  const [invitingName, setInvitingName] = useState("");
  const [Contact_person, setContact_Person] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ולידציה
    const validation = validateForm([
      { value: name, label: 'שם הפרויקט', rules: ['required'] },
      { value: invitingName, label: 'שם המזמין', rules: ['required'] },
      { value: Contact_person, label: 'איש קשר', rules: ['required'] },
    ]);

    if (!validation.isValid) {
      showValidationErrors(validation.errors, toast);
      return;
    }

    setLoading(true);

    try {
      await api.post(
        "/projects",
        { name, invitingName, Contact_person },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("הפרויקט נוצר בהצלחה ✓", {
        className: "sonner-toast success rtl",
      });

      setName("");
      setInvitingName("");
      setContact_Person("");
      navigate("/projects");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        toast.error(err.response?.data?.message || "שגיאה בלתי צפויה", {
          className: "sonner-toast error rtl",
        });
      } else {
        toast.error("נכשל ביצירת הפרויקט", {
          className: "sonner-toast error rtl",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Decorative gradient background */}
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl sm:rounded-3xl opacity-10 blur-2xl"></div>

        <div className="relative bg-white/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-orange-500/10 border border-white/50 overflow-hidden">
          {/* Header with Gradient Border */}
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-1">
            <div className="bg-white/95 backdrop-blur-xl p-4 sm:p-5 md:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <FolderPlus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900">
                    יצירת פרויקט חדש
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-slate-600">
                      הוסף פרויקט למערכת
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Project Name Section */}
            <section className="relative">
              <div className="absolute -right-4 top-0 w-1 h-full bg-gradient-to-b from-orange-500 to-amber-500 rounded-full"></div>

              <div className="flex items-center gap-3 mb-4 sm:mb-5 md:mb-6">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                  פרטי הפרויקט
                </h3>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Project Name */}
                <div className="group">
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    שם הפרויקט
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="הזן את שם הפרויקט..."
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 text-sm sm:text-base font-medium focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all group-hover:border-orange-300"
                  />
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full py-1">
                  פרטי מזמין
                </span>
              </div>
            </div>

            {/* Client Details Section */}
            <section className="relative">
              <div className="absolute -right-4 top-0 w-1 h-full bg-gradient-to-b from-amber-500 to-yellow-500 rounded-full"></div>

              <div className="flex items-center gap-3 mb-4 sm:mb-5 md:mb-6">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                  פרטי המזמין
                </h3>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Inviting Name */}
                <div className="group">
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" />
                    שם המזמין
                  </label>
                  <input
                    type="text"
                    value={invitingName}
                    onChange={(e) => setInvitingName(e.target.value)}
                    required
                    placeholder="הזן את שם המזמין..."
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 text-sm sm:text-base font-medium focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all group-hover:border-amber-300"
                  />
                </div>

                {/* Contact Person */}
                <div className="group">
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-yellow-500" />
                    איש קשר
                  </label>
                  <input
                    type="text"
                    value={Contact_person}
                    onChange={(e) => setContact_Person(e.target.value)}
                    required
                    placeholder="הזן את שם איש הקשר..."
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 text-sm sm:text-base font-medium focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-500/20 transition-all group-hover:border-yellow-300"
                  />
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>יוצר פרויקט...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                      <span>צור פרויקט</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  className="group relative px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-bold text-sm sm:text-base text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  ביטול
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-2xl opacity-30 animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default CreateProject;
