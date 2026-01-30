import React from 'react';

const Community: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-dark text-white pb-24">
      <header className="sticky top-0 z-30 bg-bg-dark/80 backdrop-blur-xl border-b border-white/5 px-6 pt-4 pb-4">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-black font-serif tracking-tight flex items-center gap-2">
                   社区 <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
               </h1>
               <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-1">Transform Together</p>
            </div>
            <div className="flex gap-4 items-center">
                <span className="material-icons-round text-gray-400">search</span>
                <img src="https://picsum.photos/id/64/100/100" className="w-8 h-8 rounded-full border border-white/20" alt="Avatar"/>
            </div>
         </div>
      </header>

      <div className="p-6 space-y-8">
         {/* Trending Section */}
         <section>
             <div className="flex justify-between items-end mb-4">
                 <h2 className="text-lg font-bold">Trending Transformations</h2>
                 <span className="text-xs text-primary cursor-pointer">View All</span>
             </div>
             <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                 {/* Card 1 */}
                 <div className="shrink-0 w-[240px] h-[320px] rounded-3xl overflow-hidden relative group">
                     <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk5RNPjbKtVUDzv2jW7vXxTPfnOdyNGuTKSdIiqS0LOrwEDRe4wKlCEzxUuiElCnk7yTG_svHTysWKMOu2QGKARlQ-4QUihAtWp-PV2ZpIxrQnLI4UmwLPx7t0W0e-6wSKpJLdbnNqhZ01lCguLgkWnm23R640nfVFjFfi-WVtJ6OUh1uI9jide9DmIOFZafgfyh2eDrPynDULFIIGL0Xef7g4Zl4go34ItT2Lfqs4OhYpuIil23JiTC5avFYTf6s2k21gsIltp1VN" 
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Transformation"/>
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90"></div>
                     <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
                         <span className="material-icons-round text-primary text-[10px]">local_fire_department</span>
                         <span className="text-[9px] font-bold uppercase">Hot</span>
                     </div>
                     <div className="absolute bottom-4 left-4 right-4">
                         <div className="flex items-center gap-2 mb-2">
                             <img src="https://picsum.photos/id/1027/50/50" className="w-6 h-6 rounded-full border border-white/20" alt="User"/>
                             <span className="text-xs font-bold">Sarah J.</span>
                         </div>
                         <div className="flex gap-2">
                             <span className="bg-primary/20 border border-primary/20 px-2 py-0.5 rounded text-[9px] text-primary font-bold">-5.2kg</span>
                             <span className="bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[9px] text-white">-4% Fat</span>
                         </div>
                     </div>
                 </div>

                  {/* Card 2 */}
                 <div className="shrink-0 w-[240px] h-[320px] rounded-3xl overflow-hidden relative group">
                     <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi4ikoe-MVDFjvj4SIFCSH4kplAY2_0M_C45mhjz57gZtEJ6owjqi28Uk8z7KIG4aSqVFs-Cr6qH74HRA5EUiPlneY3OnXpUAH3xRHy36nqaaZoKcwihv1mZwrw-92RaAp01jLegZkLs1xXMRfh_hW2hExMyQn0m8jwMZCz7Feg7kAQNU5CF3me2THLwg5ZTHVXMsE-Wwc3evDTXKvyiMwCumWSI502eSO3SrpyFRth2Bxu3oHAI65nPVW-nIlw_XQjQJG_lWv4EuY" 
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="Transformation"/>
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90"></div>
                     <div className="absolute bottom-4 left-4 right-4">
                         <div className="flex items-center gap-2 mb-2">
                             <img src="https://picsum.photos/id/1011/50/50" className="w-6 h-6 rounded-full border border-white/20" alt="User"/>
                             <span className="text-xs font-bold">Mike T.</span>
                         </div>
                         <div className="flex gap-2">
                             <span className="bg-purple-500/20 border border-purple-500/20 px-2 py-0.5 rounded text-[9px] text-purple-300 font-bold">+3kg Lean</span>
                         </div>
                     </div>
                 </div>
             </div>
         </section>

         {/* Feed Section */}
         <section>
            <h3 className="text-base font-bold mb-4">Latest Posts</h3>
            
            {/* Post 1 */}
            <article className="glass p-0 rounded-3xl overflow-hidden mb-6">
                <div className="p-4 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                           <img src="https://picsum.photos/id/338/50/50" className="w-10 h-10 rounded-full border border-white/10" alt="Avatar"/>
                           <span className="absolute -bottom-1 -right-1 bg-primary text-black text-[8px] font-bold px-1 rounded-sm">PRO</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">Jessica Wong</h4>
                            <p className="text-[10px] text-gray-400">2h ago · Yoga Flexibility</p>
                        </div>
                    </div>
                    <button className="text-gray-400"><span className="material-icons-round">more_vert</span></button>
                </div>
                
                {/* Comparison Slider Implementation (Simplified Visual) */}
                <div className="relative h-[250px] w-full bg-black group">
                     {/* Image Left (Before) */}
                     <div className="absolute inset-0 w-1/2 overflow-hidden border-r-2 border-white">
                         <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCk5RNPjbKtVUDzv2jW7vXxTPfnOdyNGuTKSdIiqS0LOrwEDRe4wKlCEzxUuiElCnk7yTG_svHTysWKMOu2QGKARlQ-4QUihAtWp-PV2ZpIxrQnLI4UmwLPx7t0W0e-6wSKpJLdbnNqhZ01lCguLgkWnm23R640nfVFjFfi-WVtJ6OUh1uI9jide9DmIOFZafgfyh2eDrPynDULFIIGL0Xef7g4Zl4go34ItT2Lfqs4OhYpuIil23JiTC5avFYTf6s2k21gsIltp1VN" className="absolute inset-0 w-[200%] max-w-none h-full object-cover" alt="Before"/>
                         <span className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-bold">WEEK 1</span>
                     </div>
                     {/* Image Right (After) */}
                     <div className="absolute inset-0 w-1/2 left-1/2 overflow-hidden">
                         <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCi4ikoe-MVDFjvj4SIFCSH4kplAY2_0M_C45mhjz57gZtEJ6owjqi28Uk8z7KIG4aSqVFs-Cr6qH74HRA5EUiPlneY3OnXpUAH3xRHy36nqaaZoKcwihv1mZwrw-92RaAp01jLegZkLs1xXMRfh_hW2hExMyQn0m8jwMZCz7Feg7kAQNU5CF3me2THLwg5ZTHVXMsE-Wwc3evDTXKvyiMwCumWSI502eSO3SrpyFRth2Bxu3oHAI65nPVW-nIlw_XQjQJG_lWv4EuY" className="absolute inset-0 w-[200%] max-w-none h-full object-cover -ml-[100%]" alt="After"/>
                         <span className="absolute top-2 right-2 bg-primary text-black px-2 py-0.5 rounded text-[9px] font-bold">WEEK 12</span>
                     </div>
                     {/* Slider Handle */}
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                             <span className="material-icons-round text-black text-[10px]">code</span>
                         </div>
                     </div>
                </div>

                <div className="p-4">
                    <p className="text-xs text-gray-300 leading-relaxed mb-3">
                        Finally achieved the splits after 3 months of consistent practice! <span className="text-primary">#RightNow</span>
                    </p>
                    <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                        <button className="flex items-center gap-1.5 text-gray-400 hover:text-primary">
                            <span className="material-icons-round text-sm">favorite_border</span>
                            <span className="text-[10px] font-bold">842</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-400 hover:text-white">
                            <span className="material-icons-round text-sm">chat_bubble_outline</span>
                            <span className="text-[10px] font-bold">45</span>
                        </button>
                    </div>
                </div>
            </article>
         </section>
      </div>
    </div>
  );
};

export default Community;
