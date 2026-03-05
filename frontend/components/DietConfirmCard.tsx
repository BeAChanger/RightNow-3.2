import React, { useState } from 'react';

interface DietConfirmCardProps {
  isOpen: boolean;
  photoUrl?: string;
  initialData: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  onConfirm: (editedData: { calories: number; protein: number; fat: number; carbs: number }) => void;
  onCancel: () => void;
}

export const DietConfirmCard: React.FC<DietConfirmCardProps> = ({
  isOpen,
  photoUrl,
  initialData,
  onConfirm,
  onCancel,
}) => {
  const [calories, setCalories] = useState(initialData.calories);
  const [protein, setProtein] = useState(initialData.protein);
  const [fat, setFat] = useState(initialData.fat);
  const [carbs, setCarbs] = useState(initialData.carbs);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-[#1a1a1a] w-full rounded-t-3xl p-6 animate-slide-up">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

        <h3 className="text-xl font-bold text-white mb-4">确认营养数据</h3>

        {photoUrl && (
          <img src={photoUrl} alt="食物" className="w-full h-40 object-cover rounded-lg mb-4" />
        )}

        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-sm">热量 (kcal)</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] text-white rounded-lg px-4 py-3 mt-1"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">蛋白质 (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] text-white rounded-lg px-4 py-3 mt-1"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">脂肪 (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] text-white rounded-lg px-4 py-3 mt-1"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm">碳水化合物 (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(Number(e.target.value))}
              className="w-full bg-[#2a2a2a] text-white rounded-lg px-4 py-3 mt-1"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#2a2a2a] text-white rounded-lg py-3 font-medium"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm({ calories, protein, fat, carbs })}
            className="flex-1 bg-[#B8FF00] text-black rounded-lg py-3 font-medium"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};
