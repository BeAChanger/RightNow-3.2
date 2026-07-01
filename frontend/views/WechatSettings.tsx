import React, { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, wechatApi } from '../api/chat';
import type { WechatBindingInfo } from '../api/chat';

interface Props {
  onBack: () => void;
}

type Step = 'idle' | 'loading' | 'qrcode' | 'scanned' | 'confirming' | 'logged-in' | 'binding' | 'bound' | 'error';

const WechatSettings: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [binding, setBinding] = useState<WechatBindingInfo | null>(null);
  const [bindCode, setBindCode] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Check current state on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await wechatApi.getBinding();
        if (!cancelled) {
          if (b) {
            setBinding(b);
            setStep('bound');
          } else {
            setStep('idle');
          }
        }
      } catch {
        if (!cancelled) setStep('idle');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Start bot login ──
  const startLogin = async () => {
    setStep('loading');
    setError(null);
    try {
      const token = localStorage.getItem('rightnow_token');
      const res = await fetch('/api/wechat/bot/login/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const qrcodeUrl = data?.data?.qrcodeUrl || data?.qrcodeUrl;
      if (!qrcodeUrl) throw new Error('No qrcodeUrl in response');

      // Render QR using qrcode lib dynamically
      setStep('qrcode');
      setTimeout(() => {
        import('qrcode').then((QRCode) => {
          if (qrRef.current) {
            QRCode.toCanvas(qrRef.current, qrcodeUrl, { width: 280, margin: 2 });
          }
        }).catch(() => setError('QR 库加载失败，请刷新页面'));
      }, 100);

      // Poll status
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch('/api/wechat/bot/login/status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const sd = await sr.json();
          const status = sd?.data?.status || sd?.status;
          if (status === 'confirmed') {
            stopPoll();
            setAccountId(sd?.data?.accountId || sd?.accountId || null);
            setStep('logged-in');
          } else if (status === 'scaned') {
            setStep('scanned');
          } else if (status === 'expired') {
            stopPoll();
            setError('二维码已过期，请重新开始');
            setStep('error');
          }
        } catch { /* poll failures ok */ }
      }, 2000);
    } catch (err: any) {
      setError(err.message || '启动登录失败');
      setStep('error');
    }
  };

  // ── Generate bind code ──
  const generateCode = async () => {
    setStep('loading');
    setError(null);
    try {
      const { code, expiresAt } = await wechatApi.generateBindCode();
      setBindCode(code);
      setStep('binding');
      // Auto-refresh binding status periodically
      const interval = setInterval(async () => {
        try {
          const b = await wechatApi.getBinding();
          if (b) {
            setBinding(b);
            setStep('bound');
            clearInterval(interval);
          }
        } catch { /* not bound yet */ }
      }, 3000);
      // Auto-stop after code expires
      const expiresIn = new Date(expiresAt).getTime() - Date.now();
      setTimeout(() => clearInterval(interval), Math.max(expiresIn + 5000, 60000));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || '生成绑定码失败');
      setStep('error');
    }
  };

  const handleUnbind = async () => {
    try {
      await wechatApi.unbind();
      setBinding(null);
      setBindCode(null);
      setStep('idle');
    } catch (err: any) {
      setError(err?.response?.data?.message || '解绑失败');
    }
  };

  // Cleanup poll on unmount
  useEffect(() => () => stopPoll(), [stopPoll]);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">微信绑定</h1>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
        {/* ── Already bound ── */}
        {step === 'bound' && binding && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center space-y-3">
              <span className="material-icons-round text-5xl text-green-400">check_circle</span>
              <p className="text-green-300 font-bold text-lg">已绑定微信</p>
              <p className="text-gray-400 text-sm">绑定时间：{new Date(binding.createdAt).toLocaleString('zh-CN')}</p>
            </div>
            <button
              onClick={handleUnbind}
              className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
            >
              解绑微信
            </button>
          </div>
        )}

        {/* ── Bot not logged in yet ── */}
        {(step === 'idle' || step === 'loading' || step === 'qrcode' || step === 'scanned' || step === 'logged-in' || step === 'error') && (
          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-4 justify-center">
              <div className={`flex items-center gap-2 ${accountId ? 'text-green-400' : step === 'qrcode' || step === 'scanned' ? 'text-primary' : 'text-gray-500'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${accountId ? 'bg-green-500/20' : step === 'qrcode' || step === 'scanned' ? 'bg-primary/20' : 'bg-gray-800'}`}>1</span>
                <span className="text-xs">扫码登录Bot</span>
              </div>
              <div className="w-8 h-px bg-gray-700" />
              <div className={`flex items-center gap-2 ${step === 'binding' || step === 'bound' ? 'text-primary' : 'text-gray-500'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'binding' || step === 'bound' ? 'bg-primary/20' : 'bg-gray-800'}`}>2</span>
                <span className="text-xs">绑定账号</span>
              </div>
            </div>

            {/* Bot login section */}
            {!accountId && (
              <>
                <div className="text-center">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    第一步：用你想做 AI 教练的微信号，扫描下方二维码登录 Bot
                  </p>
                </div>

                {/* QR Code */}
                {step === 'qrcode' || step === 'scanned' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white rounded-2xl p-4">
                      <canvas ref={qrRef} className="w-[280px] h-[280px]" />
                    </div>
                    {step === 'scanned' ? (
                      <p className="text-primary text-sm animate-pulse">👀 已扫码，请在微信上确认登录</p>
                    ) : (
                      <p className="text-gray-400 text-xs">请使用微信扫描二维码</p>
                    )}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 w-full">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={startLogin} className="mt-2 text-red-300 text-xs underline">重试</button>
                      </div>
                    )}
                  </div>
                ) : step === 'loading' ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">获取二维码中...</p>
                  </div>
                ) : step === 'error' ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-red-400 text-sm">{error || '发生错误'}</p>
                    <button onClick={startLogin} className="mt-3 text-red-300 text-xs underline">重新开始</button>
                  </div>
                ) : (
                  <button
                    onClick={startLogin}
                    className="w-full py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-icons-round">qr_code_scanner</span>
                    扫码登录 Bot
                  </button>
                )}
              </>
            )}

            {/* Bot logged in → show bind section */}
            {accountId && step !== 'bound' && step !== 'binding' && (
              <>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-3xl text-green-400 mb-2 block">check_circle</span>
                  <p className="text-green-300 text-sm">Bot 已登录</p>
                  <p className="text-gray-500 text-xs mt-1">账号 {accountId}</p>
                </div>

                <div className="text-center">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    第二步：绑定你的 RightNow 账号
                  </p>
                </div>

                <button
                  onClick={generateCode}
                  className="w-full py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-icons-round">link</span>
                  生成绑定码
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Binding code shown ── */}
        {step === 'binding' && bindCode && (
          <div className="space-y-6">
            <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-8 text-center space-y-4">
              <p className="text-gray-300 text-sm">用微信给 Bot 发送以下消息：</p>
              <div className="bg-black/50 rounded-xl py-4 px-6">
                <span className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">绑定 {bindCode}</span>
              </div>
              <p className="text-gray-500 text-xs">此码 5 分钟内有效，发送后自动绑定</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">等待绑定...</span>
            </div>
            <button
              onClick={handleUnbind}
              className="w-full py-2 text-gray-500 text-xs underline"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WechatSettings;
