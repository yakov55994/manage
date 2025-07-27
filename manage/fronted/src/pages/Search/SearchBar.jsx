import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // לצורך ניווט
// import { FiSearch } from 'react-icons/fi';
import { Search } from 'lucide-react';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {  // לוודא שה-query לא ריק
      navigate(`/search?query=${query}`);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (

 <div className="relative mb-8">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-300 font-bold bg-gray-800 border-2 border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-lg transition-all duration-300"
          placeholder="חיפוש..."
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500" size={20} />
        </div>
    </div>
  );
};

export default SearchBar;
