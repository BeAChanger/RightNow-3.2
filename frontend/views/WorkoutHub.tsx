import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { trainingApi, type TrainingRecord, type TrainingCalendarDate } from '../api/training';

interface WorkoutHubProps {
  onNavigate: (view: View, data?: any) => void;
  onBack: () => void;
}

const WorkoutHub: React.FC<WorkoutHubProps> = ({ onNavigate, onBack }) => {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [calendarDates, setCalendarDates] = useState<TrainingCalendarDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [recordsData, calendarData] = await Promise.all([
        trainingApi.list(),
        trainingApi.getCalendar(startDate, endDate),
      ]);

      setRecords(recordsData);
      setCalendarDates(calendarData.dates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    onNavigate(View.AIChat, {
      autoMessage: '[WORKOUT_MODE_START]',
      workoutMode: true,
    });
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date === selectedDate ? null : date);
  };

  const handleRecordDelete = async (id: string) => {
    if (!confirm('确定删除这条训练记录？')) return;
    try {
      await trainingApi.remove(id);
      loadData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const filteredRecords = selectedDate
    ? records.filter(r => r.date === selectedDate)
    : records;

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-20">
      <div className="p-4">
        <button onClick={onBack} className="mb-4">
          <span className="material-icons-round">arrow_back</span>
        </button>

        <h1 className="text-2xl font-bold mb-6">训练中心</h1>

        {/* Start Workout Button */}
        <button
          onClick={handleStartWorkout}
          className="w-full bg-[#B8FF00] text-black font-black py-6 rounded-xl flex items-center justify-center gap-3 mb-6 shadow-[0_0_20px_rgba(184,255,0,0.3)] active:scale-[0.98] transition-all"
        >
          <span className="material-icons-round text-3xl">fitness_center</span>
          <span className="text-xl">开始运动</span>
        </button>

        {/* Calendar */}
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-3 text-white/70">最近30天</h2>
          <div className="grid grid-cols-7 gap-2">
            {calendarDates.map((dateInfo) => {
              const day = new Date(dateInfo.date).getDate();
              const isSelected = selectedDate === dateInfo.date;
              return (
                <button
                  key={dateInfo.date}
                  onClick={() => handleDateSelect(dateInfo.date)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                    dateInfo.hasTraining
                      ? isSelected
                        ? 'bg-[#B8FF00] text-black font-bold'
                        : 'bg-[#B8FF00]/20 text-[#B8FF00] border border-[#B8FF00]/30'
                      : isSelected
                      ? 'bg-white/10 text-white'
                      : 'bg-[#1a1a1a] text-gray-500'
                  }`}
                >
                  <span>{day}</span>
                  {dateInfo.hasTraining && (
                    <span className="w-1 h-1 bg-current rounded-full mt-1"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Records List */}
        <div>
          <h2 className="text-sm font-bold mb-3 text-white/70">
            {selectedDate ? `${selectedDate} 的记录` : '历史记录'}
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无记录</div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-500">{record.date}</span>
                    <button
                      onClick={() => handleRecordDelete(record.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <span className="material-icons-round text-sm">delete</span>
                    </button>
                  </div>
                  <p className="text-sm text-white mb-2">{record.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    {record.duration && <span>⏱️ {record.duration}分钟</span>}
                    {record.todayFeeling && <span>💭 {record.todayFeeling}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutHub;
