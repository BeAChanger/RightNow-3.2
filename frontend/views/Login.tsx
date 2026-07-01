import React, { useState } from 'react';
import { authApi, getApiErrorMessage } from '../api';

interface Props {
  onLoginSuccess: (user: any) => void;
  onGoRegister: () => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess, onGoRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUseDemoAccount = () => {
    setError('');
    setEmail('test7@qq.com');
    setPassword('123456');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, '登录失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#B8FF00]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black font-serif italic text-white mb-2">
            Right<span className="text-[#B8FF00]">Now</span>
          </h1>
          <p className="text-xs text-gray-500 tracking-[0.4em] uppercase">Believing is Seeing</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1A1A1A] rounded-2xl p-6 space-y-5">
          <h2 className="text-white text-lg font-semibold text-center">登录</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-gray-400 text-xs">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B8FF00]/50 transition-colors"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-xs">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#B8FF00]/50 transition-colors"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B8FF00] text-black font-bold py-3 rounded-xl text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          <button
            type="button"
            onClick={handleUseDemoAccount}
            disabled={loading}
            className="w-full border border-white/10 text-white/80 font-medium py-3 rounded-xl text-sm hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            使用演示账号
          </button>

          <p className="text-center text-gray-500 text-xs">
            还没有账号？{' '}
            <button type="button" onClick={onGoRegister} className="text-[#B8FF00] hover:underline">
              立即注册
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
