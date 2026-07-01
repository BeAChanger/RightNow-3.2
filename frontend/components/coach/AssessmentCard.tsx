import React, { useState } from 'react';

export interface AssessmentData {
    gender?: string | null;
    height?: number | null;
    weight?: number | null;
    age?: number | null;
    currentBodyFat: string;
    targetBodyFat: string;
    goalDirection: string;
    bmr: number;
    bmi: number;
    tdee: number;
    phaseJudgment: string;
    recommendedCycle: string;
    minWeeks: number;
    isVisualAssessment?: boolean;
}

interface Props {
    data: AssessmentData;
    onDataUpdate?: (newData: AssessmentData) => void;
    onConfirm?: (selectedWeeks: number) => void;
    isConfirmed?: boolean;
}

const WEEK_OPTIONS = [8, 10, 12, 16, 20, 24, 30, 36];

const AssessmentCard: React.FC<Props> = ({ data, onDataUpdate, onConfirm, isConfirmed }) => {
    const [editableData, setEditableData] = useState<AssessmentData>(data);
    const [editingField, setEditingField] = useState<keyof AssessmentData | null>(null);
    const [tempValue, setTempValue] = useState<string>('');
    const [selectedWeeks, setSelectedWeeks] = useState<number>(data.minWeeks);
    const [showTimeWarning, setShowTimeWarning] = useState(false);

    const startEditing = (field: keyof AssessmentData) => {
        setEditingField(field);
        const rawValue = editableData[field];
        setTempValue(rawValue == null ? '' : rawValue.toString().replace(/%/g, ''));
    };

    const saveEditing = () => {
        if (!editingField) return;

        const newData = { ...editableData };
        if (editingField === 'gender') {
            newData.gender = tempValue.trim() || editableData.gender;
        } else if (editingField === 'height') {
            newData.height = parseFloat(tempValue) || editableData.height;
        } else if (editingField === 'weight') {
            newData.weight = parseFloat(tempValue) || editableData.weight;
        } else if (editingField === 'age') {
            newData.age = parseInt(tempValue, 10) || editableData.age;
        } else if (editingField === 'currentBodyFat') {
            newData.currentBodyFat = tempValue.includes('%') ? tempValue : `${tempValue}%`;
        } else if (editingField === 'bmi') {
            newData.bmi = parseFloat(tempValue) || editableData.bmi;
        } else if (editingField === 'bmr') {
            newData.bmr = parseInt(tempValue, 10) || editableData.bmr;
        } else if (editingField === 'tdee') {
            newData.tdee = parseInt(tempValue, 10) || editableData.tdee;
        }

        setEditableData(newData);
        setEditingField(null);
        if (onDataUpdate) {
            onDataUpdate(newData);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveEditing();
        if (e.key === 'Escape') setEditingField(null);
    };

    const handleWeekSelect = (weeks: number) => {
        if (weeks < data.minWeeks) {
            setShowTimeWarning(true);
            return;
        }
        setShowTimeWarning(false);
        setSelectedWeeks(weeks);
    };

    return (
        <div className="w-full bg-[#1A1A1A]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up">
            {/* Header */}
            <div className="relative p-5 pb-4 border-b border-white/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="material-icons-round text-primary text-sm">monitor_heart</span>
                        </div>
                        <h3 className="text-white font-bold text-lg tracking-wide">初始身体测评报告</h3>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-primary text-[10px] font-medium tracking-wider uppercase">
                            {editableData.phaseJudgment}
                        </span>
                    </div>
                </div>
                {data.isVisualAssessment && (
                    <div className="relative z-10 mt-2 flex items-center gap-1">
                        <span className="material-icons-round text-[12px] text-primary/70">visibility</span>
                        <span className="text-[10px] text-primary/70 font-medium">AI 视觉评估</span>
                    </div>
                )}
            </div>

            {/* Body Section */}
            <div className="p-5 space-y-5">
                {/* Goal Banner */}
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-xl border-l-2 border-primary flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">目标方向</p>
                        <p className="text-white font-bold text-base">{editableData.goalDirection}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">最短健康周期</p>
                        <p className="text-primary font-bold text-base">{editableData.minWeeks} 周</p>
                    </div>
                </div>

                {/* Basic Info Confirmation */}
                <div className="grid grid-cols-4 gap-2">
                    <MetricItem
                        label="性别"
                        value={editableData.gender === 'male' ? '男' : editableData.gender === 'female' ? '女' : (editableData.gender || '待确认')}
                        isEditing={editingField === 'gender'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('gender')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                    />
                    <MetricItem
                        label="身高"
                        value={editableData.height ? `${editableData.height} cm` : '待确认'}
                        isEditing={editingField === 'height'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('height')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                        suffix=" cm"
                    />
                    <MetricItem
                        label="体重"
                        value={editableData.weight ? `${editableData.weight} kg` : '待确认'}
                        isEditing={editingField === 'weight'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('weight')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                        suffix=" kg"
                    />
                    <MetricItem
                        label="年龄"
                        value={editableData.age ? `${editableData.age} 岁` : '待确认'}
                        isEditing={editingField === 'age'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('age')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                        suffix=" 岁"
                    />
                </div>

                {/* Body Fat Comparison */}
                <div className="grid grid-cols-2 gap-3">
                    <div
                        className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-white/20 transition-colors"
                        onClick={() => startEditing('currentBodyFat')}
                    >
                        <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <p className="text-xs text-gray-400 mb-1 relative z-10 flex items-center gap-1">
                            当前体脂 <span className="material-icons-round text-[10px] opacity-50">edit</span>
                        </p>
                        {editingField === 'currentBodyFat' ? (
                            <input
                                autoFocus
                                value={tempValue}
                                onChange={e => setTempValue(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={handleKeyDown}
                                className="w-16 bg-transparent border-b border-primary text-2xl font-bold text-white text-center outline-none relative z-10"
                            />
                        ) : (
                            <p className="text-2xl font-bold text-white relative z-10">{editableData.currentBodyFat}</p>
                        )}
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <p className="text-xs text-gray-400 mb-1 relative z-10">目标体脂</p>
                        <p className="text-2xl font-bold text-primary relative z-10">{editableData.targetBodyFat}</p>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <MetricItem
                        label="BMI"
                        value={editableData.bmi.toString()}
                        isEditing={editingField === 'bmi'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('bmi')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                    />
                    <MetricItem
                        label="基础代谢(BMR)"
                        value={`${editableData.bmr} kcal`}
                        isEditing={editingField === 'bmr'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('bmr')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                        suffix=" kcal"
                    />
                    <MetricItem
                        label="每日总消耗(TDEE)"
                        value={`${editableData.tdee} kcal`}
                        isEditing={editingField === 'tdee'}
                        tempValue={tempValue}
                        setTempValue={setTempValue}
                        onEdit={() => startEditing('tdee')}
                        onSave={saveEditing}
                        onKeyDown={handleKeyDown}
                        suffix=" kcal"
                    />
                </div>

                {/* Time Selector */}
                {!isConfirmed && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400 font-medium">选择你的目标达成时间</p>
                        <div className="flex flex-wrap gap-2">
                            {WEEK_OPTIONS.filter(w => w >= data.minWeeks).map((weeks) => (
                                <button
                                    key={weeks}
                                    onClick={() => handleWeekSelect(weeks)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                        selectedWeeks === weeks
                                            ? 'bg-primary text-black shadow-[0_0_12px_rgba(184,255,0,0.3)]'
                                            : 'bg-black/40 border border-white/10 text-gray-300 hover:bg-white/5'
                                    }`}
                                >
                                    {weeks} 周
                                </button>
                            ))}
                        </div>
                        {showTimeWarning && (
                            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2 animate-fade-in">
                                <span className="material-icons-round text-red-400 text-base shrink-0 mt-0.5">warning</span>
                                <p className="text-xs text-red-200 leading-relaxed">
                                    过快的减脂速度可能导致肌肉流失和代谢下降，建议至少 <strong className="text-white">{data.minWeeks} 周</strong> 以保障健康。
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirm Button */}
            {onConfirm && !isConfirmed && (
                <div className="px-5 pb-5">
                    <button
                        onClick={() => onConfirm(selectedWeeks)}
                        className="w-full py-3 bg-primary text-black font-bold rounded-xl shadow-[0_0_15px_rgba(184,255,0,0.3)] hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        确认无误，{selectedWeeks} 周达成目标
                        <span className="material-icons-round text-sm">check_circle</span>
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span className="material-icons-round text-[12px] opacity-70">verified</span>
                    数据由 RightNow AI 引擎分析
                </p>
            </div>
        </div>
    );
};

const MetricItem = ({
    label, value, isEditing, tempValue, setTempValue, onEdit, onSave, onKeyDown, suffix = ''
}: {
    label: string;
    value: string;
    isEditing?: boolean;
    tempValue?: string;
    setTempValue?: (val: string) => void;
    onEdit?: () => void;
    onSave?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    suffix?: string;
}) => (
    <div
        className={`flex flex-col items-center justify-center p-3 bg-white/[0.03] rounded-lg border border-white-5 relative group ${onEdit ? 'cursor-pointer hover:border-white/20 transition-colors' : ''}`}
        onClick={onEdit}
    >
        <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-1 text-center leading-tight flex items-center gap-0.5">
            {label}
            {onEdit && <span className="material-icons-round text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">edit</span>}
        </span>
        {isEditing && setTempValue ? (
            <div className="flex items-end">
                <input
                    autoFocus
                    value={tempValue}
                    onChange={e => setTempValue(e.target.value)}
                    onBlur={onSave}
                    onKeyDown={onKeyDown}
                    className="w-10 bg-transparent border-b border-primary text-sm font-semibold text-white text-center outline-none"
                    onClick={e => e.stopPropagation()}
                />
                <span className="text-[10px] text-gray-400 ml-1">{suffix.trim()}</span>
            </div>
        ) : (
            <span className="text-sm font-semibold text-gray-200">{value}</span>
        )}
    </div>
);

export default AssessmentCard;
