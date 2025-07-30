import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';
import { UserCog, Save, ArrowRight } from 'lucide-react';
import banksData from '../../../public/data/banks_and_branches.json';
import Select from 'react-select';
import BankSelector from '../../Components/BankSelector';

const SupplierEditPage = () => {
  const [supplier, setSupplier] = useState({
    name: '',
    business_tax: '',
    address: '',
    phone: '',
    email: '',
    bankDetails: {
      bankName: "",
      branchNumber: "",
      accountNumber: "",
      bankObj: null, // עזר לUI בלבד
    },
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [banks, setBanks] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    setBanks(banksData);
  }, []);

  useEffect(() => {
    const fetchSupplier = async () => {
      setInitialLoading(true);
      try {
        const response = await api.get(`/suppliers/${id}`);
        const supplierData = response.data.data;
        
        // מצא את הבנק המתאים
        const bankObj = banksData.find(b => b.bankName === supplierData.bankDetails?.bankName);

        setSupplier({
          name: supplierData.name || '',
          business_tax: supplierData.business_tax || '',
          address: supplierData.address || '',
          phone: supplierData.phone || '',
          email: supplierData.email || '',
          bankDetails: {
            bankName: supplierData.bankDetails?.bankName || '',
            bankObj: bankObj || null,
            branchNumber: supplierData.bankDetails?.branchNumber || '',
            accountNumber: supplierData.bankDetails?.accountNumber || ''
          }
        });

      } catch (error) {
        console.error('Error fetching supplier:', error);
        toast.error('שגיאה בטעינת פרטי הספק', {
          className: "sonner-toast error rtl"
        });
        navigate('/suppliers');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSupplier();
  }, [id, navigate]);

  const handleInputChange = (field, value) => {
    setSupplier(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankDetailsChange = (field, value) => {
    setSupplier(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'business_tax', 'phone']; // הסרתי address ו-email מחובה

    // בדיקת שדות עיקריים
    for (let field of requiredFields) {
      if (!supplier[field] || supplier[field].toString().trim() === '') {
        toast.error(`יש למלא את השדה: ${getFieldName(field)}`, {
          className: "sonner-toast error rtl"
        });
        return false;
      }
    }

    // בדיקת תקינות אימייל רק אם הוכנס
    if (supplier.email && supplier.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplier.email)) {
        toast.error('אימייל לא תקין', {
          className: "sonner-toast error rtl"
        });
        return false;
      }
    }

    // בדיקה שאם יש פרטי בנק חלקיים - דורש הכל
    const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
    const hasBankInfo = bankName || branchNumber || accountNumber;
    
    if (hasBankInfo) {
      if (!bankName || !branchNumber || !accountNumber) {
        toast.error("אם מזינים פרטי בנק, יש למלא את כל השדות", {
          className: "sonner-toast error rtl",
        });
        return false;
      }
    }

    return true;
  };

  const getFieldName = (field) => {
    const fieldNames = {
      name: 'שם הספק',
      business_tax: 'מספר עוסק',
      address: 'כתובת',
      phone: 'טלפון',
      email: 'אימייל'
    };
    return fieldNames[field] || field;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // נקה את הנתונים לפני השליחה
      const supplierData = {
        name: supplier.name.trim(),
        business_tax: supplier.business_tax.trim(),
        phone: supplier.phone.trim(),
        address: supplier.address?.trim() || undefined,
        email: supplier.email?.trim() || undefined,
      };

      // הוסף פרטי בנק רק אם הם מלאים
      const { bankName, branchNumber, accountNumber } = supplier.bankDetails;
      if (bankName && branchNumber && accountNumber) {
        supplierData.bankDetails = {
          bankName: bankName.trim(),
          branchNumber: branchNumber.trim(),
          accountNumber: accountNumber.trim(),
        };
      }

      console.log('Updating supplier with data:', supplierData); // לדיבוג

      await api.put(`/suppliers/${id}`, supplierData);

      toast.success('הספק עודכן בהצלחה!', {
        className: "sonner-toast success rtl"
      });
      
      navigate(`/supplier/${id}`);
    } catch (error) {
      console.error('Update error:', error.response?.data); // לדיבוג
      const errorMessage = error.response?.data?.message || 'שגיאה בעדכון הספק';
      toast.error(errorMessage, {
        className: "sonner-toast error rtl"
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <ClipLoader size={100} color="#3498db" loading={initialLoading} />
        <h1 className="mt-4 font-bold text-2xl text-cyan-950">טוען פרטי ספק . . .</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b py-8">
      <div className="container mx-auto px-4">
        {/* כותרת */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <UserCog className="text-slate-800 ml-4 mt-2 size-8" />
          <h1 className="text-4xl font-bold text-center text-slate-800">עריכת ספק</h1>
        </div>

        {/* כפתור חזרה */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => navigate(`/supplier/${id}`)}
            className="flex items-center gap-3 px-6 py-2 bg-slate-400 font-bold rounded-xl hover:bg-slate-600 hover:text-white transition-colors"
          >
            <ArrowRight size={20} />
            <span>חזור לפרטי הספק</span>
          </button>
        </div>

        {/* טופס עריכה */}
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="bg-slate-400 w-full max-w-6xl rounded-xl p-8 shadow-lg">
            
            {/* פרטי ספק עיקריים */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-6 border-b-2 border-slate-200 pb-2">
                פרטי הספק
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="font-bold text-xl text-black mb-2">
                    שם הספק <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={supplier.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-bold text-xl text-black mb-2">
                    מספר עוסק <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={supplier.business_tax}
                    onChange={(e) => handleInputChange('business_tax', e.target.value)}
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-bold text-xl text-black mb-2">
                    טלפון <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={supplier.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-bold text-xl text-black mb-2">אימייל</label>
                  <input
                    type="email"
                    value={supplier.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold"
                  />
                </div>

                <div className="flex flex-col md:col-span-2">
                  <label className="font-bold text-xl text-black mb-2">כתובת</label>
                  <input
                    type="text"
                    value={supplier.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold"
                  />
                </div>
              </div>
            </div>

            {/* פרטי בנק */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-6 border-b-2 border-slate-200 pb-2">
                פרטי חשבון בנק (אופציונלי)
              </h2>
              
              {/* בחירת בנק */}
              <div className="mb-4">
                <label className="font-bold text-xl text-black mb-2 block">בחר בנק:</label>
                <BankSelector
                  banks={banks}
                  selectedBank={supplier.bankDetails.bankObj}
                  onChange={(bank) => {
                    handleBankDetailsChange('bankName', bank?.bankName || '');
                    handleBankDetailsChange('bankObj', bank || null);
                    handleBankDetailsChange('branchNumber', '');
                  }}
                  placeholder="בחר בנק מהרשימה"
                />
              </div>

              {/* דרופדאון סניפים */}
              {supplier.bankDetails.bankObj?.branches?.length > 0 && (
                <div className="mb-4">
                  <label className="font-bold text-xl text-black mb-2 block">בחר סניף:</label>
                  <Select
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        fontWeight: 'bold',
                        fontSize: '15px'
                      }),
                      option: (provided) => ({
                        ...provided,
                        fontWeight: 'bold',
                        fontSize: '15px'
                      }),
                      placeholder: (provided) => ({
                        ...provided,
                        fontWeight: 'bold',
                        fontSize: '15px'
                      })
                    }}      
                    options={supplier.bankDetails.bankObj.branches.map(branch => ({
                      value: branch.branchCode,
                      label: `${branch.branchCode} - ${branch.city} - ${branch.address}`
                    }))}
                    value={
                      supplier.bankDetails.branchNumber
                        ? {
                            value: supplier.bankDetails.branchNumber,
                            label: supplier.bankDetails.bankObj.branches.find(b => b.branchCode === supplier.bankDetails.branchNumber)
                              ? `${supplier.bankDetails.branchNumber} - ${supplier.bankDetails.bankObj.branches.find(b => b.branchCode === supplier.bankDetails.branchNumber).city} - ${supplier.bankDetails.bankObj.branches.find(b => b.branchCode === supplier.bankDetails.branchNumber).address}`
                              : supplier.bankDetails.branchNumber
                          }
                        : null
                    }
                    onChange={opt =>
                      handleBankDetailsChange('branchNumber', opt?.value || '')
                    }
                    placeholder="בחר סניף"
                    isSearchable
                    isClearable
                  />
                </div>
              )}

              {/* שדה חשבון */}
              {supplier.bankDetails.bankName && (
                <div>
                  <label className="font-bold text-xl text-black mb-2 block">מספר חשבון:</label>
                  <input
                    type="text"
                    value={supplier.bankDetails.accountNumber}
                    onChange={(e) =>
                      handleBankDetailsChange('accountNumber', e.target.value)
                    }
                    className="bg-slate-300 border p-3 rounded-lg text-l font-bold w-full"
                    placeholder="הזן מספר חשבון"
                  />
                </div>
              )}
            </div>

            {/* כפתורי פעולה */}
            <div className="flex justify-center gap-4">
              <button
                type="submit"
                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <Save size={20} />
                {loading ? 'מעדכן...' : 'עדכן ספק'}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/supplier/${id}`)}
                className="bg-gray-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupplierEditPage;