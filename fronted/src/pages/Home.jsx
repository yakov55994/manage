import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowRightCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  // ניווט לעמוד הפרויקטים
  const handleMove = () => {
    navigate('/projects');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white -mt-10">
      <div className="text-black p-8 rounded-2xl shadow-xl text-center bg-slate-300 max-w-full">
        <div className="flex items-center justify-center gap-2">
          <Settings
            className="transition-transform hover:rotate-90 cursor-pointer size-10 -mt-5"
            color="#059669"
          />
          <h1 className="text-8xl font-extralight mb-14 whitespace-nowrap text-slate-950">
            ניהולון
          </h1>
        </div>
        <p className="text-2xl">
          האתר שינהל לך מה שצריך בצורה איכותית ונוחה!
        </p>
        <button
          onClick={handleMove}
          className="px-8 py-4 bg-gradient-to-r bg-slate-700 text-white rounded-lg shadow-lg transform transition-all hover:scale-110 active:scale-95 font-semibold text-xl hover:bg-slate-900 mt-12"
        >
          בוא נתחיל
          <ArrowRightCircle className="inline mr-3 text-2xl" />
        </button>
      </div>
    </div>
  );
};

export default Home;
