import React, { useState, useEffect } from 'react';
import { friendshipsApi } from '../api';
import type { BuddyRecommendation } from '../api';
import BuddyCard from '../components/BuddyCard';
import { View } from '../types';

interface BuddyRecommendProps {
  onNavigate: (view: View) => void;
}

const BuddyRecommend: React.FC<BuddyRecommendProps> = ({ onNavigate }) => {
  const [recommendations, setRecommendations] = useState<BuddyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await friendshipsApi.getRecommendations();
        setRecommendations(data);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAdd = async (userId: string) => {
    try {
      await friendshipsApi.request(userId);
      setRecommendations(prev => prev.filter(r => r.userId !== userId));
    } catch (err) {
      console.error('Add buddy failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24">
      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => onNavigate(View.Community)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <span className="material-icons-round text-white text-xl">arrow_back</span>
          </button>
          <h1 className="text-2xl font-black tracking-tight">搭子推荐</h1>
        </div>
        <p className="text-xs text-gray-500 ml-11">为你推荐 {recommendations.length} 位运动搭子</p>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">暂无推荐</div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(buddy => (
              <BuddyCard key={buddy.userId} buddy={buddy} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuddyRecommend;
