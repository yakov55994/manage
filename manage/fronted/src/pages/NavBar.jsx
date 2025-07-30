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

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate(); // ניווט לחיפוש

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/search?query=${query}`);
    }
  };

  return (
    <div
      dir="rtl"
      className="relative w-auto h-[130vh] overflow-hidden bg-gradient-to-b from-gray-900 to-gray-900 text-gray-100 p-6 shadow-2xl inline-block rounded-xl mt-2 mr"
    >
      {/* שדה חיפוש */}
      <div className="relative mb-8 z-10">
        <div className="relative bg-gray-800 rounded-xl border-2 border-orange-500 shadow-lg">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-300 font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-300"
            placeholder="חיפוש..."
          />
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 cursor-pointer"
            size={20}
            onClick={handleSearch}
          />
        </div>
      </div>

      {/* תפריט */}
      <nav className="space-y-2 relative z-10">
        {[
          { icon: LayoutDashboard, text: 'דף הבית', path: '/home' },
          { icon: FolderPlus, text: 'יצירת פרויקט', path: '/create-project' },
          { icon: FileText, text: 'יצירת חשבונית', path: '/create-invoice' },
          { icon: ShoppingCart, text: 'יצירת הזמנה', path: '/create-order' },
          { icon: UserPlus, text: 'יצירת ספק', path: '/create-supplier' },
          { icon: Briefcase, text: 'הצגת פרויקטים', path: '/projects' },
          { icon: Files, text: 'הצגת חשבוניות', path: '/invoices' },
          { icon: Files, text: 'הצגת הזמנות', path: '/orders' },
          { icon: Users, text: 'הצגת ספקים', path: '/suppliers' },
          { icon: ClipboardList, text: 'דף סיכום כללי', path: '/summary-page' },
          { icon: ListTodo, text: 'משימות', path: '/Notes' }
        ].map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className="group block"
            onMouseEnter={() => setActiveItem(index)}
            onMouseLeave={() => setActiveItem(null)}
          >
            <div
              className={`flex items-center rounded-xl p-3 transition-all duration-300 ${
                activeItem === index
                  ? 'bg-orange-500 shadow-lg shadow-orange-500/50 scale-105'
                  : 'hover:bg-gray-700'
              }`}
            >
              <item.icon
                className={`transition-all duration-300 ml-3 ${
                  activeItem === index ? 'text-white rotate-12 scale-110' : 'text-orange-400'
                }`}
                size={20}
              />
              <span className="font-medium text-l transition-all duration-300">{item.text}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
