import React, { useState } from 'react';
import { View } from '../types';
import { weightApi } from '../api';

interface Props {
    onBack: () => void;
    onNavigate?: (view: View) => void;
    onSaveRecord?: (record: { date: string; weight: number; waist?: number }) => void;
}

const WeightRecord: React.FC<Props> = ({ onBack, onSaveRecord }) => {
    // Auto-set today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);

    const [weight, setWeight] = useState('');
    const [waist, setWaist] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await weightApi.create({
                date,
                weight: parseFloat(weight) || 0,
                waist: waist ? parseFloat(waist) : undefined,
            });
            if (onSaveRecord) {
                onSaveRecord({
                    date,
                    weight: parseFloat(weight) || 0,
                    waist: waist ? parseFloat(waist) : undefined,
                });
            }
            onBack();
        } catch (e: any) {
            setError(e?.response?.data?.message || '保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-dark text-white font-sans flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round text-white">close</span>
                </button>
                <h1 className="text-lg font-serif font-bold tracking-widest">记录数据</h1>
                <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

                {/* Date Selector */}
                <div className="space-y-3">
                    <label className="text-sm text-gray-400 font-bold tracking-wider">记录日期</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#111] border border-white/10 rounded-2xl px-5 py-4 text-white font-serif text-lg appearance-none focus:outline-none focus:border-[#B8FF00] transition-colors"
                        />
                        <span className="material-icons-round absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none">calendar_today</span>
                    </div>
                </div>

                {/* Weight Input (Required) */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="text-sm text-gray-400 font-bold tracking-wider">体重 <span className="text-primary">*</span></label>
                    </div>
                    <div className="relative flex items-center">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            className="w-full bg-[#111] border border-white/10 rounded-2xl pl-5 pr-16 py-6 text-white font-serif text-4xl focus:outline-none focus:border-[#B8FF00] transition-colors"
                            autoFocus
                        />
                        <span className="absolute right-6 text-gray-500 font-bold uppercase tracking-widest pointer-events-none">kg</span>
                    </div>
                </div>

                {/* Waist Input (Optional) */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="text-sm text-gray-400 font-bold tracking-wider">腰围 <span className="text-gray-600 text-[10px] font-normal tracking-normal">(选填)</span></label>
                    </div>
                    <div className="relative flex items-center">
                        <input
                            type="number"
                            value={waist}
                            onChange={(e) => setWaist(e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            className="w-full bg-[#111] border border-white/10 rounded-2xl pl-5 pr-16 py-4 text-white font-serif text-2xl focus:outline-none focus:border-[#B8FF00] transition-colors"
                        />
                        <span className="absolute right-6 text-gray-500 font-bold uppercase tracking-widest pointer-events-none">cm</span>
                    </div>
                </div>

            </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

            {/* Footer Save Button */}
            <div className="p-6 pb-safe bg-gradient-to-t from-bg-dark via-bg-dark/80 to-transparent">
                <button
                    onClick={handleSave}
                    disabled={!weight || saving}
                    className={`w-full py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all ${weight && !saving ? 'bg-[#B8FF00] text-black shadow-[0_0_20px_rgba(184,255,0,0.3)] hover:bg-[#a6e600] active:scale-[0.98]' : 'bg-white/10 text-gray-500'
                        }`}
                >
                    <span className="material-icons-round">{saving ? 'hourglass_empty' : weight ? 'check' : 'edit'}</span>
                    <span>{saving ? '保存中...' : '保存记录'}</span>
                </button>
            </div>

        </div>
    );
};

export default WeightRecord;
