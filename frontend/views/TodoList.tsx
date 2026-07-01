import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { todosApi, type TodoItem } from '../api/todos';

interface TodoListProps {
  onNavigate: (view: View) => void;
}

const getLocalDateString = (): string => {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
};

const TodoList: React.FC<TodoListProps> = ({ onNavigate }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTodos = async () => {
      const date = getLocalDateString();
      try {
        await todosApi.ensureDaily(date);
        const loadedTodos = await todosApi.list(date);
        setTodos(loadedTodos);
      } catch (err) {
        console.error('Failed to load todos:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadTodos();
  }, []);

  const handleToggle = async (id: string) => {
    await todosApi.toggle(id);
    const date = getLocalDateString();
    const updated = await todosApi.list(date);
    setTodos(updated);
  };

  const handleTodoClick = (todo: TodoItem) => {
    if (todo.category === 'training' && !todo.completed) {
      onNavigate(View.TrainingLog);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#B8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white pb-20 font-sans">
      <div className="p-5">
        <div className="flex justify-between items-center mb-6 mt-2">
          <h1 className="text-2xl font-black tracking-wide">今日待办</h1>
          <span className="text-[10px] font-bold text-[#B8FF00] bg-[#B8FF00]/10 px-2 by-0.5 rounded-full border border-[#B8FF00]/20 hidden">
            {todos.filter((t) => t.completed).length} / {todos.length}
          </span>
        </div>

        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 opacity-80 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <span className="material-icons-round text-5xl text-[#B8FF00]/70">fitness_center</span>
            </div>
            <p className="text-base font-medium text-white tracking-wide mb-2">今天还没有训练计划</p>
            <p className="text-xs text-gray-500">点击浮标，让 AI 教练为你生成突围计划</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => handleTodoClick(todo)}
                className={`group relative overflow-hidden rounded-xl p-4 flex items-center gap-4 transition-all duration-300 border backdrop-blur-sm ${
                  todo.completed
                    ? 'bg-gradient-to-r from-[#B8FF00]/10 to-[#1a1a1a] border-[#B8FF00]/30 shadow-[0_0_15px_rgba(184,255,0,0.05)] cursor-default'
                    : 'bg-[#1a1a1a] border-white/5 active:scale-[0.98] cursor-pointer'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggle(todo.id);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 relative z-10 ${
                    todo.completed
                      ? 'bg-[#B8FF00] border-none shadow-[0_0_10px_rgba(184,255,0,0.5)] scale-110'
                      : 'border-2 border-gray-600 hover:border-gray-400 group-hover:border-[#B8FF00]/50'
                  }`}
                >
                  {todo.completed && (
                    <span className="material-icons-round text-black text-sm animate-pop-in">check</span>
                  )}
                </button>

                <div className="flex-1 relative z-10 overflow-hidden">
                  <p
                    className={`font-bold tracking-wide transition-all duration-300 truncate ${
                      todo.completed ? 'text-gray-500 line-through' : 'text-white'
                    }`}
                  >
                    {todo.title}
                  </p>

                  {todo.completedSource === 'auto' && (
                    <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded border bg-[#B8FF00]/10 border-[#B8FF00]/30 animate-fade-in">
                      <span className="material-icons-round text-[#B8FF00] text-[10px]">auto_awesome</span>
                      <p className="text-[10px] font-bold text-[#B8FF00] tracking-wider uppercase">已自动同步</p>
                    </div>
                  )}
                </div>

                {todo.category === 'training' && !todo.completed && (
                  <span className="material-icons-round text-gray-600 text-sm group-hover:text-[#B8FF00] transition-colors relative z-10">
                    chevron_right
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
