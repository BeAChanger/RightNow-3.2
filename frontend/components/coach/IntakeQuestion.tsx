import React, { useState } from 'react';

export type QuestionType = 'single' | 'multi' | 'multi-with-text' | 'frequency' | 'text';

export interface IntakeQuestionProps {
    question: string;
    type: QuestionType;
    options: string[];
    onAnswer: (answer: string | string[]) => void;
    isAnswered?: boolean;
    otherPlaceholder?: string;
}

const IntakeQuestion: React.FC<IntakeQuestionProps> = ({ question, type, options, onAnswer, isAnswered = false, otherPlaceholder }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [otherText, setOtherText] = useState("");
    const [showFrequencyCorrection, setShowFrequencyCorrection] = useState(false);

    const handleOptionClick = (opt: string) => {
        if (isAnswered) return;

        if (type === 'single') {
            setSelected([opt]);
        } else if (type === 'frequency') {
            setSelected([opt]);
            if (opt === '1-2天') {
                setShowFrequencyCorrection(true);
            } else {
                setShowFrequencyCorrection(false);
            }
        } else {
            // Multi select
            setSelected(prev =>
                prev.includes(opt) ? prev.filter(item => item !== opt) : [...prev, opt]
            );
        }
    };

    const handleSubmit = () => {
        if (type === 'single' || type === 'frequency') {
            onAnswer(selected[0]);
        } else if (type === 'text') {
            onAnswer(otherText.trim() || selected[0] || '');
        } else {
            const finalAnswer = [...selected];
            if (otherText.trim()) {
                finalAnswer.push(`其他: ${otherText.trim()}`);
            }
            onAnswer(finalAnswer);
        }
    };

    const handleCorrectionAccept = () => {
        setShowFrequencyCorrection(false);
        setSelected(['3天']);
        onAnswer('3天');
    };

    return (
        <div className={`w-full max-w-sm bg-[#1A1A1A]/90 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 animate-slide-up ${isAnswered ? 'opacity-70 scale-95 pointer-events-none' : ''}`}>
            <div className="p-5">
                <div className="mb-6 text-center mt-2">
                    <p className="text-white text-base leading-relaxed font-bold tracking-wide">{question}</p>
                </div>

                <div className="space-y-2 mt-2">
                    {options.map((opt) => {
                        const isSelected = selected.includes(opt);
                        return (
                            <button
                                key={opt}
                                onClick={() => handleOptionClick(opt)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all duration-300 ${isSelected
                                    ? 'bg-primary border-primary text-black font-semibold shadow-[0_0_15px_rgba(184,255,0,0.2)]'
                                    : 'bg-black/40 border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <span className="text-sm">{opt}</span>
                                {isSelected && type !== 'single' && type !== 'frequency' && (
                                    <span className="material-icons-round text-sm">check_circle</span>
                                )}
                            </button>
                        );
                    })}

                    {/* Free Text Input for 'text' type */}
                    {type === 'text' && (
                        <div className="mt-2">
                            <textarea
                                placeholder={otherPlaceholder || '请输入...'}
                                value={otherText}
                                onChange={(e) => {
                                    setOtherText(e.target.value);
                                    if (e.target.value.trim()) {
                                        setSelected([e.target.value.trim()]);
                                    } else {
                                        setSelected([]);
                                    }
                                }}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-gray-600 transition-colors resize-none"
                            />
                        </div>
                    )}

                    {/* Text Input for 'multi-with-text' */}
                    {type === 'multi-with-text' && (
                        <div className="mt-3 relative">
                            <input
                                type="text"
                                placeholder={otherPlaceholder || '如果有其他情况，请描述...'}
                                value={otherText}
                                onChange={(e) => setOtherText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-gray-600 transition-colors"
                            />
                        </div>
                    )}
                </div>

                {/* Correction UI for Frequency */}
                {showFrequencyCorrection && (
                    <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 animate-fade-in-up">
                        <div className="flex gap-2 mb-3">
                            <span className="material-icons-round text-red-400 text-lg shrink-0">info</span>
                            <p className="text-xs text-red-200 leading-relaxed">
                                为了达到你设定的身材目标，我们建议每周至少进行 <strong className="text-white">3次</strong> 训练。我可以帮你直接设定为每周3天吗？
                            </p>
                        </div>
                        <button
                            onClick={handleCorrectionAccept}
                            className="w-full py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 active:scale-95 transition-all shadow-md"
                        >
                            没问题，听你的 (设为3天)
                        </button>
                    </div>
                )}

                {/* Action Button for All types */}
                {(() => {
                    const isValid = selected.length > 0 || otherText.trim().length > 0;
                    const isFrequencyBlocked = type === 'frequency' && selected[0] === '1-2天';
                    const canSubmit = isValid && !isFrequencyBlocked;

                    return !isAnswered && (
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full mt-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all duration-300 ${canSubmit
                                ? 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(184,255,0,0.3)] active:scale-95'
                                : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            确认发送
                            <span className="material-icons-round text-sm">send</span>
                        </button>
                    );
                })()}
            </div>
        </div>
    );
};

export default IntakeQuestion;
