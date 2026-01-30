import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onBack: () => void;
}

const AIChat: React.FC<Props> = ({ onBack }) => {
  const [messages, setMessages] = useState<any[]>([
    { 
      id: 1, 
      text: "你好！我是你的 AI 运动专家。根据你目前的训练进度（C阶段），建议今天关注核心稳定性。有什么具体问题想问我吗？", 
      sender: 'ai',
      time: '刚刚'
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg = { 
      id: Date.now(), 
      text: inputValue, 
      sender: 'user', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    // Simulate AI thinking and response
    setTimeout(() => {
      let responseText = "这是一个很好的问题。综合你的体能数据，我建议你可以尝试增加组间休息时间，或者降低重量专注于动作的标准性。";
      
      if (inputValue.includes("吃") || inputValue.includes("饮食")) {
        responseText = "关于饮食，考虑到你今天的热量缺口，晚餐建议摄入高蛋白低脂食物，例如鸡胸肉或白鱼，搭配西兰花。";
      } else if (inputValue.includes("痛") || inputValue.includes("伤")) {
        responseText = "如果感到疼痛，请立即停止训练并休息。建议对该部位进行冰敷，如果持续疼痛请咨询专业医生。";
      } else if (inputValue.includes("计划") || inputValue.includes("练")) {
        responseText = "我们可以调整一下计划。明天可以安排一组 HIIT 燃脂训练，配合 30 分钟的力量训练，重点攻克腹部线条。";
      }

      const aiMsg = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1500);
  };

  return (
    <div className="h-screen bg-bg-dark flex flex-col relative z-50">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform">
          <span className="material-icons-round text-white">arrow_back</span>
        </button>
        <div className="flex items-center gap-3">
           <div className="relative">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[#7aab00] flex items-center justify-center shadow-[0_0_15px_rgba(184,255,0,0.3)]">
                <span className="material-icons-round text-black text-xl">smart_toy</span>
             </div>
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
           </div>
           <div>
             <h1 className="text-base font-bold text-white">AI 运动专家</h1>
             <p className="text-[10px] text-primary flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
               在线 · 随时响应
             </p>
           </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#050505]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
               <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
                 msg.sender === 'user' 
                 ? 'bg-primary text-black rounded-tr-none' 
                 : 'bg-[#1A1A1A] text-gray-200 rounded-tl-none border border-white/5'
               }`}>
                 {msg.text}
               </div>
               <span className="text-[10px] text-gray-600 mt-1 px-1">{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0A0A0A] border-t border-white/10 pb-safe">
        <div className="flex gap-2 items-end">
           <button className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <span className="material-icons-round">add_circle_outline</span>
           </button>
           <div className="flex-1 bg-[#1A1A1A] rounded-2xl flex items-center px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-colors">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="问问关于深蹲的技巧..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none min-h-[40px]"
              />
           </div>
           <button 
             onClick={handleSend}
             disabled={!inputValue.trim()}
             className={`p-3 rounded-full flex items-center justify-center transition-all ${
               inputValue.trim() 
               ? 'bg-primary text-black hover:bg-primary-dark shadow-[0_0_15px_rgba(184,255,0,0.3)] transform active:scale-95' 
               : 'bg-[#1A1A1A] text-gray-600'
             }`}
           >
              <span className="material-icons-round">send</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;