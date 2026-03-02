import React from 'react';

export interface TaskItem {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    type: 'workout' | 'diet' | 'hydration';
    isCompleted?: boolean;
}

export interface FirstDayPlanData {
    title: string;
    description: string;
    tasks: TaskItem[];
}

interface Props {
    data: FirstDayPlanData;
    onCheckInClick: () => void;
}

const FirstDayPlanCard: React.FC<Props> = ({ data, onCheckInClick }) => {
    return (
        <div className="w-full bg-[#1A1A1A]/80 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(184,255,0,0.05)] animate-fade-in-up">
            {/* Header */}
            <div className="p-5 pb-4 bg-gradient-to-b from-primary/10 to-transparent relative">
                <div className="absolute top-0 right-4 w-16 h-16 bg-primary/20 blur-2xl rounded-full"></div>
                <h3 className="text-xl font-bold text-white mb-2 relative z-10 flex items-center gap-2">
                    <span className="material-icons-round text-primary">fitness_center</span>
                    {data.title}
                </h3>
                <p className="text-sm text-gray-400 relative z-10">{data.description}</p>
            </div>

            {/* Task List */}
            <div className="p-5 pt-2 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">今日行动项</h4>

                {data.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${task.isCompleted ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400'
                            }`}>
                            <span className="material-icons-round">{task.isCompleted ? 'check_circle' : task.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{task.title}</p>
                            <p className="text-[10px] text-gray-400 truncate">{task.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Footer */}
            <div className="p-5 pt-2 border-t border-white/5">
                <button
                    onClick={onCheckInClick}
                    className="w-full py-3.5 bg-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-[#a3e600] active:scale-95 transition-all shadow-[0_0_20px_rgba(184,255,0,0.2)]"
                >
                    <span className="material-icons-round text-[18px]">camera_alt</span>
                    去打卡，记录首日汗水！
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-3 flex items-center justify-center gap-1">
                    <span className="material-icons-round text-[12px]">auto_awesome</span>
                    完成打卡，教练将为你生成专属总结
                </p>
            </div>
        </div>
    );
};

export default FirstDayPlanCard;
