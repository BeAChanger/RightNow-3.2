import React, { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage, trainingApi } from '../api';
import type { TrainingRecord } from '../api/training';

interface Props {
  onBack: () => void;
}

interface DaySummary {
  date: string;
  totalDuration: number;
  count: number;
  records: TrainingRecord[];
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

const getLocalDateString = (): string => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
};

const toDateKey = (date: Date): string => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
};

const formatDateLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

const formatRecordTime = (value?: string): string => {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const buildWeekDates = (selectedDate: string): string[] => {
  const target = new Date(`${selectedDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return [];
  }

  const day = target.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(target);
  monday.setDate(target.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
};

const TrainingHistory: React.FC<Props> = ({ onBack }) => {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  useEffect(() => {
    void loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await trainingApi.list();
      const safeRecords = Array.isArray(data) ? data : [];
      setRecords(safeRecords);

      if (
        safeRecords.length > 0 &&
        !safeRecords.some(
          (record) => typeof record?.date === 'string' && record.date === selectedDate,
        )
      ) {
        const latestDate =
          typeof safeRecords[0]?.date === 'string' ? safeRecords[0].date : getLocalDateString();
        setSelectedDate(latestDate);
      }
    } catch (e: any) {
      setError(getApiErrorMessage(e, '加载失败'));
    } finally {
      setLoading(false);
    }
  };

  const daySummaries = useMemo<DaySummary[]>(() => {
    const grouped = new Map<string, DaySummary>();

    records.forEach((record) => {
      const key = typeof record?.date === 'string' ? record.date : '';
      if (!key) {
        return;
      }

      const duration =
        typeof record.duration === 'number' && Number.isFinite(record.duration)
          ? record.duration
          : 0;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          totalDuration: 0,
          count: 0,
          records: [],
        });
      }

      const current = grouped.get(key);
      if (!current) {
        return;
      }

      current.totalDuration += duration;
      current.count += 1;
      current.records.push(record);
    });

    return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const selectedSummary = useMemo(
    () => daySummaries.find((summary) => summary.date === selectedDate) || null,
    [daySummaries, selectedDate],
  );

  const weekDates = useMemo(() => buildWeekDates(selectedDate), [selectedDate]);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col font-sans">
      <div className="px-6 pt-12 pb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">训练历史</h1>
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
        >
          <span className="material-icons-round text-white/70">close</span>
        </button>
      </div>

      <div className="px-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 tracking-widest uppercase">选择日期</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B8FF00]/50"
          />
        </div>

        {weekDates.length > 0 && (
          <div className="flex justify-between text-center text-gray-500">
            {weekDates.map((dateKey) => {
              const date = new Date(`${dateKey}T00:00:00`);
              const weekday = WEEKDAY_LABELS[date.getDay()] || '-';
              const isSelected = dateKey === selectedDate;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`flex flex-col gap-2 items-center transition-colors ${
                    isSelected ? 'text-[#B8FF00]' : 'hover:text-gray-300'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-60">{weekday}</span>
                  <span
                    className={`text-sm w-8 h-8 rounded-full flex items-center justify-center ${
                      isSelected
                        ? 'border border-[#B8FF00] bg-[#B8FF00]/20 text-white shadow-[0_0_10px_rgba(184,255,0,0.25)]'
                        : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-5 pb-10">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && <div className="text-center py-8 text-gray-500">加载中...</div>}

        {!loading && daySummaries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <span className="material-icons-round text-3xl mb-2 block opacity-30">fitness_center</span>
            暂无训练记录
          </div>
        )}

        {!loading && daySummaries.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 tracking-widest uppercase">按天查看</p>
            {daySummaries.map((summary) => {
              const isActive = summary.date === selectedDate;
              return (
                <button
                  key={summary.date}
                  onClick={() => setSelectedDate(summary.date)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-[#151515] border-[#B8FF00]/40 shadow-[0_0_18px_rgba(184,255,0,0.08)]'
                      : 'bg-[#111] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{summary.date}</p>
                      <p className="text-xs text-gray-500 mt-1">{summary.count} 条训练记录</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#B8FF00] font-bold text-lg">{summary.totalDuration} 分钟</p>
                      <p className="text-[11px] text-gray-500 mt-1">点击查看当天详情</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 tracking-widest uppercase">当天记录</p>
              <p className="text-sm text-gray-500">{formatDateLabel(selectedDate)}</p>
            </div>

            {selectedSummary?.records?.length ? (
              selectedSummary.records.map((record, index) => {
                const description =
                  typeof record?.description === 'string' && record.description.trim().length > 0
                    ? record.description
                    : '未填写训练描述';
                const feeling = typeof record?.todayFeeling === 'string' ? record.todayFeeling : '';
                const photoUrl = typeof record?.photoUrl === 'string' ? record.photoUrl : '';
                const duration =
                  typeof record?.duration === 'number' && Number.isFinite(record.duration)
                    ? record.duration
                    : null;
                const timeText = formatRecordTime(record.createdAt);

                return (
                  <div
                    key={record?.id || `${selectedDate}-${index}`}
                    className="bg-[#101010] p-4 rounded-2xl border border-white/5"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-gray-500">
                        {timeText ? `${selectedDate} ${timeText}` : selectedDate}
                      </div>
                      {duration !== null && (
                        <div className="text-[#B8FF00] text-sm font-bold">{duration} 分钟</div>
                      )}
                    </div>

                    <div className="text-white font-bold mb-2">{description}</div>
                    {feeling && <div className="text-sm text-gray-400">{feeling}</div>}

                    {photoUrl && (
                      <img
                        src={photoUrl}
                        className="w-full h-48 object-cover rounded-xl mt-3"
                        alt="Training"
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 bg-[#101010] border border-white/5 rounded-2xl">
                该日期暂无训练记录
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingHistory;