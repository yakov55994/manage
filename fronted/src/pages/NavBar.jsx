import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx'

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate(); // ניווט לחיפוש

    const { isAdmin } = useAuth()
  
  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?query=${query}`);
    }
  };
return (
   <div
     dir="rtl"
     className="fixed top-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-gray-100 px-6 py-4 shadow-2xl z-50 border-b-2 border-orange-500/30"
   >
     <div className="flex items-center justify-between h-12 צש">
       
       {/* לוגו ושם המערכת - בצד ימין */}
       {/* <div className="flex items-center gap-3">
         <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
           <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
           </svg>
         </div>
         <div className="text-right">
           <h1 className="text-xl font-bold text-orange-400 text-center">מערכת ניהול</h1>
         </div>
       </div> */}

       {/* תפריט ניווט מרכזי */}
       <nav className="flex items-center gap-2 -mr-5">
         {[
           { icon: LayoutDashboard, text: "דף הבית", path: "/home", desc: "מסך ראשי" },
           { icon: FolderPlus, text: "יצירת פרויקט", path: "/create-project", desc: "פרויקט חדש" },
           { icon: FileText, text: "יצירת חשבונית", path: "/create-invoice", desc: "חשבונית חדשה" },
           { icon: ShoppingCart, text: "יצירת הזמנה", path: "/create-order", desc: "הזמנה חדשה" },
           { icon: UserPlus, text: "יצירת ספק", path: "/create-supplier", desc: "ספק חדש" },
           { icon: Briefcase, text: "הצגת פרויקטים", path: "/projects", desc: "כל הפרויקטים" },
           { icon: Files, text: "הצגת חשבוניות", path: "/invoices", desc: "כל החשבוניות" },
           { icon: Files, text: "הצגת הזמנות", path: "/orders", desc: "כל ההזמנות" },
           { icon: Users, text: "הצגת ספקים", path: "/suppliers", desc: "כל הספקים" },
           { icon: ClipboardList, text: "דף סיכום", path: "/summary-page", desc: "סיכום כללי" },
           { icon: ListTodo, text: "משימות", path: "/Notes", desc: "רשימת משימות" },
             ...(isAdmin ? [{
    icon: ListTodo,
    text: "ניהול משתמשים",
    path: "/admin",
    desc: "ניהול משתמשים והרשאות"
  }] : []),

         ].map((item, index) => (
           <Link
             key={index}
             to={item.path}
             className="group relative"
             onMouseEnter={() => setActiveItem(index)}
             onMouseLeave={() => setActiveItem(null)}
           >
             <div
               className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 min-w-[80px] ${
                 activeItem === index
                   ? "bg-gradient-to-b from-orange-500 to-orange-600 shadow-xl shadow-orange-500/40 scale-105 transform"
                   : "hover:bg-gray-700/60 hover:scale-102 transform"
               }`}
             >
               <item.icon
                 className={`transition-all duration-300 ${
                   activeItem === index 
                     ? "text-white drop-shadow-lg" 
                     : "text-orange-400 group-hover:text-orange-300"
                 }`}
                 size={22}
               />
               <span className={`text-sm font-medium transition-all duration-300 text-center leading-tight ${
                 activeItem === index 
                   ? "text-white drop-shadow-sm" 
                   : "text-gray-300 group-hover:text-white"
               }`}>
                 {item.text}
               </span>
             </div>
             
             {/* Tooltip מפורט */}
             <div className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-xl z-50 whitespace-nowrap">
               <div className="font-semibold text-orange-400">{item.text}</div>
               <div className="text-xs text-gray-300 mt-1">{item.desc}</div>
               {/* חץ קטן */}
               <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
             </div>
           </Link>
         ))}
       </nav>

       {/* חיפוש וסטטוס - בצד שמאל */}
       <div className="flex items-center gap-4">
         {/* שדה חיפוש מעוצב */}
         <div className="relative">
           <div className="relative bg-gray-800/80 backdrop-blur-sm rounded-xl border border-orange-500/50 shadow-lg">
             <input
               type="text"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && handleSearch()}
               className="w-64 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-400 bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-sm"
               placeholder="חיפוש בכל המערכת..."
             />
             <Search
               className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 cursor-pointer hover:text-orange-400 transition-colors"
               size={18}
               onClick={handleSearch}
             />
             {/* אפקט זוהר */}
             <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
           </div>
         </div>

         {/* אינדיקטור סטטוס */}
         {/* <div className="flex items-center gap-3 bg-gray-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-600/50">
           <div className="flex items-center gap-2">
             <div className="relative">
               <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
               <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
             </div>
             <div className="text-right">
               <div className="text-sm font-medium text-green-400">מחובר</div>
               <div className="text-xs text-gray-400">מערכת פעילה</div>
             </div>
           </div>
         </div> */}
       </div>

     </div>
   </div>
 );
};

export default Sidebar;
