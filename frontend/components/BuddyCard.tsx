import React from 'react';
import type { BuddyRecommendation } from '../api';

interface BuddyCardProps {
  buddy: BuddyRecommendation;
  onAdd: (userId: string) => void;
}

const BuddyCard: React.FC<BuddyCardProps> = ({ buddy, onAdd }) => {
  return (
    <div className="flex-shrink-0 w-[280px] bg-[#1A1A1A] rounded-2xl p-4 border border-white/5">
      <div className="flex items-start gap-3 mb-3">
        {buddy.avatar ? (
          <img src={buddy.avatar} className="w-12 h-12 rounded-full border border-white/10" alt={buddy.name} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#B8FF00]/20 border border-[#B8FF00]/30 flex items-center justify-center">
            <span className="text-[#B8FF00] font-bold">{buddy.name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{buddy.name}</h4>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-icons-round text-[#B8FF00] text-xs">star</span>
            <span className="text-xs text-[#B8FF00] font-bold">{buddy.matchScore}% 匹配</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">{buddy.reason}</p>
      <button
        onClick={() => onAdd(buddy.userId)}
        className="w-full bg-[#B8FF00] hover:bg-[#a3e000] text-black text-xs font-bold py-2 rounded-lg transition-colors"
      >
        添加搭子
      </button>
    </div>
  );
};

export default BuddyCard;
