import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderPlus,
  FileText,
  ShoppingCart,
  Briefcase,
  Files,
  ClipboardList,
  ListTodo,
  Search,
  UserPlus,
  Users,
  ChevronDown,
  Menu,
  X,
  DollarSign,
  DownloadCloud,
  UserCircle,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import NotificationCenter from "../Components/notifications/NotificationCenter";
import MasavHistoryModal from "../Components/MasavHistoryModal";

const Sidebar = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [query, setQuery] = useState("");
  const [closeTimeout, setCloseTimeout] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveGroup, setMobileActiveGroup] = useState(null);
  const [masavHistoryOpen, setMasavHistoryOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);
  const navigate = useNavigate();

  const { isAdmin, canViewModule, canEditModule, canViewAnyProject, user, isAuthenticated, logout } = useAuth();

  // סגירת popup אווטאר בלחיצה מחוץ לאלמנט
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setAvatarOpen(false);
    const result = await logout();
    if (result.success) {
      toast.success("ההתנתקות בוצעה בהצלחה, להתראות 👋", {
        duration: 5000,
        className: "sonner-toast success rtl",
      });
      navigate("/login");
    } else {
      toast.error("שגיאה בהתנתקות");
    }
  };

  const handleMouseEnter = (groupId) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setActiveDropdown(groupId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 300);
    setCloseTimeout(timeout);
  };

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?query=${query}`);
    }
  };

  // ============================================
  // תפריט מקובץ עם dropdowns
  // ============================================
  const menuGroups = [
    {
      id: "home",
      icon: LayoutDashboard,
      text: "דף הבית",
      path: "/home",
      show: true,
      type: "single", // לא dropdown
    },
    {
      id: "projects",
      icon: Briefcase,
      text: "פרויקטים",
      show: isAdmin || canViewAnyProject() || canEditModule(null, "projects"),
      type: "dropdown",
      items: [
        {
          text: "יצירת פרויקט",
          path: "/create-project",
          show: isAdmin,
        },
        {
          text: "הצגת פרויקטים",
          path: "/projects",
          show: isAdmin || canViewAnyProject(),
        },
      ],
    },
    {
      id: "invoices",
      icon: FileText,
      text: "חשבוניות",
      show: isAdmin || canViewModule(null, "invoices") || canEditModule(null, "invoices"),
      type: "dropdown",
      items: [
        {
          text: "יצירת חשבונית",
          path: "/create-invoice",
          show: canEditModule(null, "invoices") && user?.role !== "accountant",
        },
        {
          text: "הצגת חשבוניות",
          path: "/invoices",
          show: isAdmin || canViewModule(null, "invoices"),
        },
        {
          text: "היסטוריית מסב",
          path: "#masav-history",
          show: isAdmin || user?.role === "accountant",
          onClick: () => setMasavHistoryOpen(true),
        },
      ],
    },
    {
      id: "salaries",
      icon: Users,
      text: "משכורות",
      show: isAdmin, // רק מנהלים
      type: "dropdown",
      items: [
        {
          text: "יצירת משכורת",
          path: "/create-salary",
          show: isAdmin,
        },
        {
          text: "הצגת משכורות",
          path: "/salaries",
          show: isAdmin,
        },
      ],
    },
    {
      id: "finance",
      icon: DollarSign,
      text: "תנועות בנק",
      show: isAdmin, // רק מנהלים
      type: "dropdown",
      items: [
        {
          text: "הכנסות",
          path: "/incomes",
          show: isAdmin,
        },
        {
          text: "הוצאות",
          path: "/expenses",
          show: isAdmin,
        },
        {
          text: "העלאת אקסל",
          path: "/excel-upload",
          show: isAdmin,
        },
      ],
    },
    {
      id: "orders",
      icon: ShoppingCart,
      text: "הזמנות",
      show: isAdmin || canViewModule(null, "orders") || canEditModule(null, "orders"),
      type: "dropdown",
      items: [
        {
          text: "יצירת הזמנה",
          path: "/create-order",
          show: canEditModule(null, "orders"),
        },
        {
          text: "הצגת הזמנות",
          path: "/orders",
          show: isAdmin || canViewModule(null, "orders"),
        },
      ],
    },
    {
      id: "suppliers",
      icon: UserPlus,
      text: "ספקים",
      show: isAdmin || canViewModule(null, "suppliers") || canEditModule(null, "suppliers"),
      type: "dropdown",
      items: [
        {
          text: "יצירת ספק",
          path: "/create-supplier",
          show: canEditModule(null, "suppliers"),
        },
        {
          text: "הצגת ספקים",
          path: "/suppliers",
          show: isAdmin || canViewModule(null, "suppliers"),
        },
      ],
    },
    {
      id: "summary",
      icon: ClipboardList,
      text: "דף סיכום",
      path: "/summary-page",
      show: isAdmin,
      type: "single",
    },
    {
      id: "admin",
      icon: ListTodo,
      text: "ניהול",
      show: isAdmin,
      type: "dropdown",
      items: [
        {
          text: "משימות",
          path: "/Notes",
          show: isAdmin,
        },
        {
          text: "ניהול משתמשים",
          path: "/admin",
          show: isAdmin,
        },
        {
          text: "ייצוא נתונים",
          path: "/export-data",
          show: isAdmin,
        },
      ],
    },
  ];

  return (
    <>
      <div
        dir="rtl"
        className="fixed top-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-gray-100 px-4 md:px-6 py-3 md:py-4 shadow-2xl z-50 border-b-2 border-orange-500/30"
      >
        <div className="flex items-center justify-between h-10 md:h-12">
          {/* כפתור תפריט המבורגר - רק במובייל */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-700/50 transition-all"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-orange-400" />
            ) : (
              <Menu className="w-6 h-6 text-orange-400" />
            )}
          </button>

          {/* תפריט ניווט - מוסתר במובייל */}
          <nav className="hidden md:flex items-center gap-1">
            {menuGroups
              .filter((group) => group.show)
              .map((group) => {
                if (group.type === "single") {
                  // פריט רגיל ללא dropdown
                  return (
                    <Link
                      key={group.id}
                      to={group.path}
                      className="group relative"
                    >
                      <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-300 hover:bg-gradient-to-b hover:from-orange-500 hover:to-orange-600 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105 transform whitespace-nowrap">
                        <group.icon className="text-orange-400 group-hover:text-white transition-all" size={16} />
                        <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-all">
                          {group.text}
                        </span>
                      </div>
                    </Link>
                  );
                } else {
                  // פריט עם dropdown
                  const visibleItems = group.items.filter((item) => item.show);
                  if (visibleItems.length === 0) return null;

                  return (
                    <div
                      key={group.id}
                      className="relative"
                      onMouseEnter={() => handleMouseEnter(group.id)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer whitespace-nowrap ${activeDropdown === group.id
                        ? "bg-gradient-to-b from-orange-500 to-orange-600 shadow-xl shadow-orange-500/40 scale-105 transform"
                        : "hover:bg-gray-700/60"
                        }`}>
                        <group.icon
                          className={`transition-all ${activeDropdown === group.id ? "text-white" : "text-orange-400"
                            }`}
                          size={16}
                        />
                        <span
                          className={`text-xs font-medium transition-all ${activeDropdown === group.id ? "text-white" : "text-gray-300"
                            }`}
                        >
                          {group.text}
                        </span>
                        <ChevronDown
                          className={`transition-all duration-300 ${activeDropdown === group.id ? "rotate-180 text-white" : "text-orange-400"
                            }`}
                          size={14}
                        />
                      </div>

                      {/* Dropdown Menu */}
                      {activeDropdown === group.id && (
                        <div className="absolute top-full mt-2 right-0 bg-gray-800 border-2 border-orange-500/50 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden w-max min-w-[200px] z-50 animate-fadeIn">
                          {visibleItems.map((item, index) =>
                            item.onClick ? (
                              <button
                                key={index}
                                onClick={() => { item.onClick(); setActiveDropdown(null); }}
                                className="block w-full text-right px-5 py-3 text-sm font-medium text-gray-300 hover:bg-orange-500 hover:text-white transition-all border-b border-gray-700 last:border-b-0 whitespace-nowrap"
                              >
                                {item.text}
                              </button>
                            ) : (
                              <Link
                                key={index}
                                to={item.path}
                                className="block px-5 py-3 text-sm font-medium text-gray-300 hover:bg-orange-500 hover:text-white transition-all border-b border-gray-700 last:border-b-0 whitespace-nowrap"
                              >
                                {item.text}
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              })}
          </nav>

          {/* חיפוש, התראות ואווטאר - responsive */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* אווטאר משתמש */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate("/login");
                  } else {
                    setAvatarOpen(!avatarOpen);
                  }
                }}
                className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full border-2 transition-all hover:scale-105 ${
                  isAuthenticated
                    ? "border-green-500 bg-green-500/20 hover:bg-green-500/30"
                    : "border-red-500 bg-red-500/20 hover:bg-red-500/30"
                }`}
              >
                <UserCircle className={`w-5 h-5 md:w-6 md:h-6 ${isAuthenticated ? "text-green-400" : "text-red-400"}`} />
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isAuthenticated ? "bg-green-500" : "bg-red-500"}`} />
              </button>

              {/* Popup אווטאר */}
              {avatarOpen && isAuthenticated && (
                <div className="absolute top-full mt-2 left-0 bg-gray-800 border-2 border-orange-500/50 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden w-max min-w-[200px] z-50 animate-fadeIn">
                  <div className="px-5 py-3 border-b border-gray-700">
                    <div className="text-sm font-bold text-white">{user?.username}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-green-400">מחובר/ת</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <LogOut size={16} />
                    <span>התנתקות</span>
                  </button>
                </div>
              )}
            </div>

            {isAdmin &&
              <NotificationCenter />
            }

            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="חיפוש..."
                className="w-32 sm:w-48 md:w-64 px-3 md:px-4 py-1.5 md:py-2 pr-8 md:pr-10 bg-gray-700/50 border-2 border-gray-600 rounded-xl text-sm md:text-base text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
              />
              <Search
                className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-orange-400"
                size={16}
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm md:text-base font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
            >
              חפש
            </button>
          </div>
        </div>
      </div>

      {/* תפריט מובייל */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            dir="rtl"
            className="fixed top-0 right-0 bottom-0 w-80 bg-gradient-to-b from-gray-900 via-slate-800 to-gray-900 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* כותרת התפריט */}
            <div className="p-4 border-b-2 border-orange-500/30 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">תפריט</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-700/50 transition-all"
              >
                <X className="w-6 h-6 text-orange-400" />
              </button>
            </div>

            {/* פריטי התפריט */}
            <div className="p-4 space-y-2">
              {menuGroups
                .filter((group) => group.show)
                .map((group) => {
                  if (group.type === "single") {
                    return (
                      <Link
                        key={group.id}
                        to={group.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 transition-all"
                      >
                        <group.icon className="text-orange-400" size={20} />
                        <span className="text-sm font-medium text-gray-300">
                          {group.text}
                        </span>
                      </Link>
                    );
                  } else {
                    const visibleItems = group.items.filter((item) => item.show);
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={group.id} className="space-y-1">
                        <button
                          onClick={() =>
                            setMobileActiveGroup(
                              mobileActiveGroup === group.id ? null : group.id
                            )
                          }
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <group.icon className="text-orange-400" size={20} />
                            <span className="text-sm font-medium text-gray-300">
                              {group.text}
                            </span>
                          </div>
                          <ChevronDown
                            className={`text-orange-400 transition-transform ${mobileActiveGroup === group.id ? "rotate-180" : ""
                              }`}
                            size={18}
                          />
                        </button>

                        {mobileActiveGroup === group.id && (
                          <div className="pr-4 space-y-1">
                            {visibleItems.map((item, index) =>
                              item.onClick ? (
                                <button
                                  key={index}
                                  onClick={() => { item.onClick(); setMobileMenuOpen(false); }}
                                  className="block w-full text-right px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-orange-500 hover:text-white transition-all"
                                >
                                  {item.text}
                                </button>
                              ) : (
                                <Link
                                  key={index}
                                  to={item.path}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-orange-500 hover:text-white transition-all"
                                >
                                  {item.text}
                                </Link>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
            </div>
          </div>
        </div>
      )}

      <MasavHistoryModal open={masavHistoryOpen} onClose={() => setMasavHistoryOpen(false)} />
    </>
  );
};

export default Sidebar;
