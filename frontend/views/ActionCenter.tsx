import React, { useState, useEffect } from 'react';
import { aiCoachApi, getApiErrorMessage, todosApi, trainingApi, trainingSessionApi } from '../api';
import type { TodoItem as ApiTodoItem } from '../api/todos';
import { View } from '../types';

interface Props {
    onClose: () => void;
    onSave?: (photo: string | null) => void;
    onNavigate?: (view: View, data?: any) => void;
}


const ActionCenter: React.FC<Props> = ({ onClose, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'todo' | 'training'>('todo');
    const [todos, setTodos] = useState<ApiTodoItem[]>([]);
    const [todosLoading, setTodosLoading] = useState(true);
    const [trainingRecords, setTrainingRecords] = useState<any[]>([]);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [creatingSession, setCreatingSession] = useState(false);
    const [error, setError] = useState('');

    const getLocalDateString = (): string => {
        const now = new Date();
        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return localTime.toISOString().slice(0, 10);
    };

    const today = getLocalDateString();

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
        if (activeTab === 'training') {
            loadTrainingRecords();
        }
    }, [activeTab]);

    const loadTrainingRecords = async () => {
        setTrainingLoading(true);
        setError('');
        try {
            const records = await trainingApi.list(today);
            setTrainingRecords(Array.isArray(records) ? records : []);
        } catch (e: any) {
            setError(getApiErrorMessage(e, '加载训练记录失败'));
        } finally {
            setTrainingLoading(false);
        }
    };

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


    const toggleTodo = async (id: string) => {
        try {
            const updated = await todosApi.toggle(id);
            setTodos(prev => (Array.isArray(prev) ? prev.map(t => t.id === id ? updated : t) : [updated]));
        } catch (e: any) {
            setError(e?.response?.data?.message || '操作失败');
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
                        onClick={() => setActiveTab('training')}
                        className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all duration-300 ${activeTab === 'training' ? 'bg-[#1a1a1a] shadow-md text-[#B8FF00]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        训练
                    </button>
                </div>
            </div>

            {/* Training Buttons - Only show in training tab */}
            {activeTab === 'training' && (
                <div className="px-6 py-4 space-y-3">
                    <button
                        onClick={async () => {
                            if (creatingSession) {
                                return;
                            }

                            setError('');
                            setCreatingSession(true);
                            try {
                                const session = await trainingSessionApi.create();
                                onNavigate?.(View.AIChat, { mode: 'training', sessionId: session.id });
                            } catch (e: any) {
                                setError(getApiErrorMessage(e, '创建训练会话失败'));
                            } finally {
                                setCreatingSession(false);
                            }
                        }}
                        disabled={creatingSession}
                        className={creatingSession ? 'w-full text-black font-black text-base py-4 rounded-2xl shadow-[0_10px_20px_rgba(184,255,0,0.2)] transition-all flex justify-center items-center gap-2 bg-[#6e8b1f] cursor-not-allowed opacity-70' : 'w-full text-black font-black text-base py-4 rounded-2xl shadow-[0_10px_20px_rgba(184,255,0,0.2)] transition-all flex justify-center items-center gap-2 bg-[#B8FF00] hover:bg-[#a3e000] active:scale-[0.98]'}
                    >
                        <span className="material-icons-round">fitness_center</span>
                        开始训练
                    </button>
                    <button
                        onClick={() => onNavigate?.(View.TrainingHistory)}
                        className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white font-bold text-base py-4 rounded-2xl active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                    >
                        <span className="material-icons-round">history</span>
                        历史记录
                    </button>
                </div>
            )}

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
                    <div className="px-6 space-y-4 animate-slide-up">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        {trainingLoading && (
                            <div className="text-center py-8 text-gray-500">加载中...</div>
                        )}
                        {!trainingLoading && trainingRecords.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <span className="material-icons-round text-3xl mb-2 block opacity-30">fitness_center</span>
                                今日暂无训练记录
                            </div>
                        )}
                        {trainingRecords.map(record => (
                            <div key={record.id} className="bg-[#111] p-5 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-white font-bold">{(typeof record?.description === 'string' ? record.description : '').substring(0, 50)}{typeof record?.description === 'string' && record.description.length > 50 ? '...' : ''}</div>
                                    {record.duration && <div className="text-[#B8FF00] text-sm font-bold">{record.duration}分钟</div>}
                                </div>
                                {record.photoUrl && (
                                    <img src={record.photoUrl} className="w-full h-32 object-cover rounded-xl mt-3" alt="Training" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
};

export default ActionCenter;

















