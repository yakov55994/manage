import { useState, useEffect } from 'react';
import { Settings, ArrowRightCircle, Target, Zap, Shield } from 'lucide-react';
import { useNavigate } from "react-router-dom";


const Home = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate()


  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleMove = () => {
    // כאן תוכל להחליף לפונקציית הניווט שלך
    navigate('/projects')
  };

  const features = [
    { icon: Target, text: "ניהול מדויק" },
    { icon: Zap, text: "מהיר וחכם" },
    { icon: Shield, text: "אמין ובטוח" }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern Gradient Mesh Background */}
      <div className=" fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-900 to-black -z-10">
        
        {/* Large Abstract Shapes */}
        <div className="absolute inset-0">
          {/* Top Right Blob */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-bl from-cyan-500/20 to-purple-600/20 rounded-full blur-3xl"></div>
          
          {/* Bottom Left Blob */}
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-500/20 to-orange-500/20 rounded-full blur-3xl"></div>
          
          {/* Center Accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}></div>
        </div>

        {/* Diagonal Lines Accent */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full transform rotate-12">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white"
                style={{
                  left: `${i * 5}%`,
                  width: '1px',
                  height: '150%',
                  top: '-25%'
                }}
              />
            ))}
          </div>
        </div>

        {/* Noise Texture Overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-soft-light"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Cpolygon fill='%23000' points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
               backgroundSize: '50px 50px'
             }}>
        </div>
      </div>

      {/* Remove CSS animations */}
      <style>{`
        /* Static styling only */
      `}</style>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Main Content Card */}
        <div className={`transform transition-all duration-1000 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="backdrop-blur-xl bg-white/10 p-12 rounded-2xl sm:rounded-3xl shadow-2xl text-center border border-white/20 max-w-4xl">
            
            {/* Header with Logo */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8">
              <Settings
                className="mr-28 transition-all duration-700 hover:rotate-180 cursor-pointer size-16 text-orange-400 drop-shadow-lg animate-pulse"
              />
              <h1 className="ml-48 mx-auto text-7xl md:text-8xl font-extralight text-white drop-shadow-2xl bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                ניהולון
              </h1>
            </div>

            {/* Subtitle with Typing Effect */}
            <div className="mb-12">
              <p className="text-2xl md:text-xl sm:text-2xl md:text-3xl text-gray-200 font-light leading-relaxed">
                האתר שינהל לך מה שצריך בצורה 
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent font-semibold"> איכותית ונוחה!</span>
              </p>
            </div>

            {/* Feature Icons */}
            <div className="flex justify-center gap-3 sm:gap-4 sm:p-4 sm:p-5 md:p-6 md:p-8 mb-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center gap-2 transform transition-all duration-700 hover:scale-110 ${
                    isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full border border-white/20 backdrop-blur-sm hover:from-purple-500/30 hover:to-cyan-500/30 transition-all duration-300">
                    <feature.icon className="size-8 text-white" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Call to Action Button */}
           <button
              onClick={handleMove}
              className="group relative px-12 py-5 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-orange-500/25 active:scale-95 font-bold text-xl overflow-hidden"
            >
              {/* Button Background Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Button Content */}
              <div className="relative flex items-center gap-3">
                <span>בוא נתחיל</span>
                <ArrowRightCircle className="size-6 transform group-hover:translate-x-1 transition-transform duration-300" />
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>

            {/* Bottom Decoration */}
            <div className="mt-8 flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 rounded-full"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
};

export default Home;