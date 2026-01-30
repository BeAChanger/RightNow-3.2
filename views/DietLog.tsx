import React from 'react';

const DietLog: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-dark text-white pb-24 px-6 pt-12">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black font-serif tracking-tight">近期饮食</h1>
        <div className="flex flex-col items-center">
             <span className="text-4xl font-serif italic text-white font-bold">27</span>
             <span className="text-xs text-gray-500 uppercase">1月 2024</span>
        </div>
      </header>

      {/* Calendar Strip (Simplified) */}
      <div className="flex justify-between mb-8 text-center text-gray-500">
         {['M','T','W','T','F','S','S'].map((d, i) => (
             <div key={i} className={`flex flex-col gap-2 ${i === 5 ? 'text-primary' : ''}`}>
                 <span className="text-[10px] font-bold opacity-50">{d}</span>
                 <span className={`text-sm ${i === 5 ? 'w-8 h-8 rounded-full bg-primary/20 border border-primary text-white flex items-center justify-center shadow-[0_0_10px_rgba(184,255,0,0.3)]' : ''}`}>
                    {22 + i}
                 </span>
             </div>
         ))}
      </div>

      <div className="space-y-6">
          {/* Food Card 1 */}
          <div className="glass rounded-[32px] p-4 border-white/5 relative overflow-hidden group">
              <div className="aspect-[4/3] w-full rounded-[24px] overflow-hidden relative mb-4">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSyOeCAj5bcehe36grtZoNwmoZY7ZIwTerkWGZVlf1cec4ng7PzQYm7FAVOgXxSYMOK63LvobIWIiva9xCJfwegkHwcn7PXPRGmoeg-BSHHaBs-5ARUxe6F33Ldk0sA1SjVET42opzS2p85cVEncN45Y7_ELSPuEIeEcPyo2MEO5dpNqeAIA-bGaLutuH8bZ3KeqLQYDNeCJ5ZK3-Fn17F3c68SJQGQLnFjrxDxslmJ821Y6rBm-6QQiL7SQwXfXgdjXFplRhrhog-" 
                       alt="Sausage" className="w-full h-full object-cover"/>
                  
                  {/* Floating Macro Card */}
                  <div className="absolute top-4 right-4 w-40 bg-[#F5F5F0]/95 backdrop-blur-md rounded-2xl p-3 text-black shadow-xl">
                      <div className="flex justify-between items-baseline mb-2 border-b border-black/10 pb-1">
                          <span className="font-serif font-bold text-sm">Calories</span>
                          <span className="font-black text-lg">156</span>
                      </div>
                      <div className="space-y-1 text-[10px] opacity-80">
                          <div className="flex justify-between"><span>脂肪</span><b>12g</b></div>
                          <div className="flex justify-between"><span>蛋白质</span><b>5.2g</b></div>
                          <div className="flex justify-between"><span>碳水</span><b>4g</b></div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-between items-start px-2">
                  <div>
                      <h3 className="text-xl font-bold font-serif">肉肠</h3>
                      <div className="flex items-center gap-2 mt-1 opacity-50">
                          <span className="text-lg">🌭</span>
                          <span className="text-xs font-mono">16:39</span>
                      </div>
                  </div>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400">家常菜</span>
              </div>
          </div>

          {/* Food Card 2 */}
           <div className="glass rounded-[32px] p-4 border-white/5 relative overflow-hidden group">
              <div className="aspect-[4/3] w-full rounded-[24px] overflow-hidden relative mb-4">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFOyiS98qgEO0gBNxdFLNQpnxHHaOr9fSWkJvXuM9jP3HRQubqzKhDIJ-71CmEiRZMlN6L-cPkNIPkSIkavII_0FPqMQe6JKlQyfFfnYE-XnIrlkoEjIB32x5eQdhX2Tfd7Rq0qukGTDDPDgHq3Z-MVr-lVLutq9WT2ELqTmmS5HHLR9SvFb24VnureVQ-de6E5EY8EGHyU2kn6EPAuaN-QUPtPQdiQnKk0ISQ4gslTq77cHSYkrnXi_ZUufTsCJvtzNEtUbtcH8xJ" 
                       alt="Snack" className="w-full h-full object-cover"/>
                   {/* Floating Macro Card */}
                  <div className="absolute top-4 right-4 w-40 bg-[#F5F5F0]/95 backdrop-blur-md rounded-2xl p-3 text-black shadow-xl">
                      <div className="flex justify-between items-baseline mb-2 border-b border-black/10 pb-1">
                          <span className="font-serif font-bold text-sm">Calories</span>
                          <span className="font-black text-lg">92</span>
                      </div>
                      <div className="space-y-1 text-[10px] opacity-80">
                          <div className="flex justify-between"><span>脂肪</span><b>0.4g</b></div>
                          <div className="flex justify-between"><span>蛋白质</span><b>1.2g</b></div>
                          <div className="flex justify-between"><span>碳水</span><b>22g</b></div>
                      </div>
                  </div>
              </div>
              <div className="flex justify-between items-start px-2">
                  <div>
                      <h3 className="text-xl font-bold font-serif">红枣果脯</h3>
                      <div className="flex items-center gap-2 mt-1 opacity-50">
                          <span className="text-lg">🫐</span>
                          <span className="text-xs font-mono">15:20</span>
                      </div>
                  </div>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400">小吃</span>
              </div>
          </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30">
          <button className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(184,255,0,0.4)] hover:scale-110 transition-transform">
              <span className="material-icons-round text-3xl">add_a_photo</span>
          </button>
      </div>
    </div>
  );
};

export default DietLog;
