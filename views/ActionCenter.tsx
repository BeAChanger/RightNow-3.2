import React, { useState, useRef, useEffect } from 'react';
import { trainingApi } from '../api';
import { todosApi } from '../api';
import { uploadApi } from '../api';
import { aiCoachApi } from '../api';
import type { TodoItem as ApiTodoItem } from '../api/todos';

interface Props {
    onClose: () => void;
    onSave?: (photo: string | null) => void;
}


const ActionCenter: React.FC<Props> = ({ onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<'todo' | 'log'>('todo');
    const [todos, setTodos] = useState<ApiTodoItem[]>([]);
    const [todosLoading, setTodosLoading] = useState(true);
    const [logText, setLogText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(45);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const today = new Date().toISOString().split('T')[0];

    const mapCoachTaskCategory = (task: { category?: string; title?: string; detail?: string }): string => {
        if (task.category === 'nutrition') return 'diet';
        if (task.category === 'recovery') {
            const text = `${task.title || ''} ${task.detail || ''}`.toLowerCase();
            if (
                text.includes('water') ||
                text.includes('drink') ||
                text.includes('hydration') ||
                text.includes('ml')
            ) {
                return 'water';
            }
        }
        return 'training';
    };

    const seedTodosFromCoachPlan = async (date: string): Promise<boolean> => {
        try {
            const progress = await aiCoachApi.getProgress();
            const tasks = Array.isArray(progress?.activePlan?.tasks) ? progress.activePlan.tasks : [];
            const normalized = tasks
                .map((task) => ({
                    title: typeof task?.title === 'string' ? task.title.trim() : '',
                    detail: typeof task?.detail === 'string' ? task.detail.trim() : '',
                    category: typeof task?.category === 'string' ? task.category : 'training',
                }))
                .filter((task) => task.title.length > 0);

            if (normalized.length === 0) {
                return false;
            }

            const results = await Promise.allSettled(
                normalized.map((task) =>
                    todosApi.create({
                        title: task.title,
                        category: mapCoachTaskCategory(task),
                        date,
                    }),
                ),
            );
            return results.some((item) => item.status === 'fulfilled');
        } catch {
            return false;
        }
    };

    useEffect(() => {
        loadTodos();
    }, []);

    const loadTodos = async () => {
        setTodosLoading(true);
        setError('');
        try {
            try {
                await todosApi.ensureDaily(today);
            } catch {
                // Best effort: older backend versions may not expose ensure-daily.
            }

            let list = await todosApi.list(today);
            let safeList = Array.isArray(list) ? list : [];

            if (safeList.length === 0) {
                const seeded = await seedTodosFromCoachPlan(today);
                if (seeded) {
                    list = await todosApi.list(today);
                    safeList = Array.isArray(list) ? list : [];
                }
            }

            setTodos(safeList);
        } catch (e: any) {
            setError(e?.response?.data?.message || '加载待办失败');
        } finally {
            setTodosLoading(false);
        }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleTodo = async (id: string) => {
        try {
            const updated = await todosApi.toggle(id);
            setTodos(prev => (Array.isArray(prev) ? prev.map(t => t.id === id ? updated : t) : [updated]));
        } catch (e: any) {
            setError(e?.response?.data?.message || '操作失败');
        }
    };

    const handleMicClick = () => {
        if (isRecording) {
            // Stop recording
            setIsRecording(false);
            // Simulate transcribed text appending
            setLogText(prev => prev + (prev ? ' ' : '') + '今天练了胸背超级组，感觉还不错。');
        } else {
            // Start recording
            setIsRecording(true);
        }
    };

    const safeTodos = Array.isArray(todos) ? todos : [];
    const completedCount = safeTodos.filter(t => t.completed).length;
    const progress = safeTodos.length > 0 ? (completedCount / safeTodos.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans animate-fade-in relative z-50">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#B8FF00]/5 blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="px-6 pt-12 pb-2 flex justify-between items-center relative z-10">
                <h1 className="text-3xl font-serif font-bold tracking-wide">行动中心</h1>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
                    <span className="material-icons-round text-white/70">close</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 py-4 relative z-10">
                <div className="flex bg-[#111] p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('todo')}
                        className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all duration-300 ${activeTab === 'todo' ? 'bg-[#1a1a1a] shadow-md text-[#B8FF00]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        今日 TODO
                    </button>
                    <button
                        onClick={() => setActiveTab('log')}
                        className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all duration-300 ${activeTab === 'log' ? 'bg-[#1a1a1a] shadow-md text-[#B8FF00]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        记录训练
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative z-10 pb-10">
                {activeTab === 'todo' ? (
                    <div className="px-6 space-y-6 animate-slide-up">
                        {/* Progress Bar */}
                        <div className="bg-[#111] p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                            <div className="flex justify-between items-end mb-3 relative z-10">
                                <div>
                                    <span className="text-gray-400 text-[11px] uppercase tracking-widest font-bold">今日完成度</span>
                                    <div className="text-2xl font-serif font-bold text-white mt-1">{completedCount} <span className="text-gray-500 text-sm">/ {safeTodos.length}</span></div>
                                </div>
                                <span className="text-[#B8FF00] font-black italic text-xl">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-black/50 rounded-full overflow-hidden relative z-10 border border-white/5">
                                <div className="h-full bg-gradient-to-r from-[#B8FF00]/50 to-[#B8FF00] rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        {/* Todo List */}
                        <div className="space-y-3">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            {todosLoading && (
                                <div className="text-center py-8 text-gray-500">加载中...</div>
                            )}
                            {!todosLoading && safeTodos.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="material-icons-round text-3xl mb-2 block opacity-30">checklist</span>
                                    今日暂无待办事项
                                </div>
                            )}
                            {safeTodos.map(todo => (
                                <div
                                    key={todo.id}
                                    onClick={() => toggleTodo(todo.id)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer active:scale-[0.98] ${todo.completed ? 'bg-[#111]/50 border-white/5' : 'bg-[#161616] border-[#B8FF00]/20 hover:border-[#B8FF00]/40'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${todo.completed ? 'bg-[#B8FF00] border-[#B8FF00]' : 'border-gray-600'}`}>
                                        {todo.completed && <span className="material-icons-round text-black text-[14px]">check</span>}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className={`text-[15px] font-bold transition-colors ${todo.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                                            {todo.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm ${todo.category === 'diet' ? 'bg-orange-500/20 text-orange-400' :
                                                todo.category === 'water' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                                }`}>
                                            {todo.category === 'diet' ? '营养' : todo.category === 'water' ? '补水' : '训练'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="px-6 space-y-8 animate-slide-up">
                        {/* Log Input */}
                        <div className="space-y-3 relative">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">训练内容</h2>
                            <div className="relative">
                                <textarea
                                    value={logText}
                                    onChange={(e) => setLogText(e.target.value)}
                                    placeholder={isRecording ? "正在聆听..." : "今天练了什么？感受如何？..."}
                                    className={`w-full bg-[#111] border rounded-3xl p-5 pb-16 text-white placeholder-gray-600 min-h-[140px] resize-none focus:outline-none transition-colors ${isRecording ? 'border-[#B8FF00] shadow-[0_0_15px_rgba(184,255,0,0.2)]' : 'border-white/10 focus:border-[#B8FF00]/50'}`}
                                />
                                {/* Voice Input Button */}
                                <button
                                    onClick={handleMicClick}
                                    className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRecording
                                        ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                        : 'bg-white/10 text-gray-400 hover:bg-[#B8FF00] hover:text-black hover:shadow-[0_0_15px_rgba(184,255,0,0.3)]'
                                        }`}
                                >
                                    <span className="material-icons-round text-xl">
                                        {isRecording ? 'stop' : 'mic'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Duration Slider */}
                        <div className="space-y-5 bg-[#111] p-6 rounded-3xl border border-white/5">
                            <div className="flex justify-between items-center">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">运动时长</h2>
                                <div className="flex items-baseline gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        max="720"
                                        value={duration}
                                        onChange={(e) => {
                                            let val = parseInt(e.target.value);
                                            if (isNaN(val)) val = 0;
                                            if (val > 720) val = 720;
                                            if (val < 0) val = 0;
                                            setDuration(val);
                                        }}
                                        className="w-20 text-right bg-transparent border-b border-transparent focus:border-[#B8FF00]/50 outline-none text-4xl font-serif font-thin text-[#B8FF00] transition-colors"
                                    />
                                    <span className="text-[10px] text-gray-500 font-bold tracking-widest">分钟</span>
                                </div>
                            </div>

                            <div className="w-full h-10 relative flex items-center">
                                <div className="absolute inset-x-0 h-1 bg-gray-800 rounded-full"></div>
                                <div className="absolute left-0 h-1 bg-[#B8FF00] rounded-full" style={{ width: `${(duration / 720) * 100}%` }}></div>

                                <input
                                    type="range"
                                    min="0"
                                    max="720"
                                    step="5"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                />
                                <div
                                    className="absolute w-5 h-5 bg-white border-2 border-[#B8FF00] rounded-full shadow-[0_0_10px_rgba(184,255,0,0.5)] pointer-events-none transform -translate-x-1/2"
                                    style={{ left: `${(duration / 720) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-600 font-mono font-bold">
                                <span>0</span>
                                <span>6h</span>
                                <span>12h</span>
                            </div>
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">视觉打卡</h2>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-gray-700 hover:border-[#B8FF00]/40 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 transition-all bg-[#111]/50 active:scale-[0.99] overflow-hidden group"
                            >
                                {selectedPhoto ? (
                                    <img src={selectedPhoto} className="w-full h-full object-cover" alt="Preview" />
                                ) : (
                                    <>
                                        <span className="material-icons-round text-3xl group-hover:text-[#B8FF00] transition-colors">add_a_photo</span>
                                        <span className="text-xs font-bold tracking-widest">添加训练照片</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Submit */}
                        <div className="pt-8 pb-12">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm mb-4">
                                    {error}
                                </div>
                            )}
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    setError('');
                                    try {
                                        let photoUrl: string | undefined;
                                        if (selectedFile) {
                                            const res = await uploadApi.upload(selectedFile);
                                            photoUrl = res.url;
                                        }
                                        await trainingApi.create({
                                            description: logText,
                                            duration,
                                            photoUrl,
                                            date: today,
                                        });
                                        if (onSave) onSave(selectedPhoto);
                                        onClose();
                                    } catch (e: any) {
                                        setError(e?.response?.data?.message || '保存失败');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="w-full bg-[#B8FF00] hover:bg-[#a3e000] disabled:bg-white/10 disabled:text-gray-500 text-black font-black text-lg py-5 rounded-full shadow-[0_15px_30px_rgba(184,255,0,0.25)] active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                            >
                                <span className="material-icons-round text-xl">{saving ? 'hourglass_empty' : 'file_upload'}</span>
                                {saving ? '保存中...' : '保存记录'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionCenter;
