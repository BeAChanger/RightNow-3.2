import React from 'react';
import { View } from '../types';

interface Props {
  currentView: View;
  setView: (view: View) => void;
}

const BottomNav: React.FC<Props> = ({ currentView, setView }) => {
  const navItemsLeft = [
    { view: View.Dashboard, icon: 'face', label: '首页' },
    { view: View.Stats, icon: 'bar_chart', label: '数据' },
  ];

  const navItemsRight = [
    { view: View.Diet, icon: 'restaurant_menu', label: '饮食' },
    { view: View.Community, icon: 'groups', label: '社区' },
  ];

  // Hide bottom nav on immersive views
  const isHidden =
    currentView === View.Onboarding ||
    currentView === View.Splash ||
    currentView === View.Evolution ||
    currentView === View.AIChat ||
    currentView === View.CheckInType ||
    currentView === View.CheckInBody ||
    currentView === View.CheckInSuccess ||
    currentView === View.CheckInShare;

  if (isHidden) return null;

  const NavItem: React.FC<{ item: any }> = ({ item }) => {
    const isActive = currentView === item.view;
    return (
      <button
        onClick={() => setView(item.view)}
        className="flex flex-col items-center gap-1 w-16 group relative"
      >
        <div className={`transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
          <span className={`material-icons-round text-2xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(184,255,0,0.5)]' : ''}`}>
            {item.icon}
          </span>
        </div>
        {isActive && (
          <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_5px_#B8FF00]"></div>
        )}
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#030303]/90 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 z-40">
      <div className="flex justify-between items-end px-4 pb-6 relative">
        {/* Left Items */}
        <div className="flex gap-6">
          {navItemsLeft.map((item) => <NavItem key={item.view} item={item} />)}
        </div>

        {/* Center Check-in Button */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8">
          <button
            onClick={() => setView(View.ActionCenter)}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(184,255,0,0.5)] border-4 border-[#030303] active:scale-95 transition-transform group"
          >
            <span className="material-icons-round text-3xl group-hover:rotate-12 transition-transform duration-300">flag</span>
          </button>
        </div>

        {/* Right Items */}
        <div className="flex gap-6">
          {navItemsRight.map((item) => <NavItem key={item.view} item={item} />)}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;