import React, { useState, useEffect, useCallback } from 'react';
import { View } from '../types';
import type { AuthUser } from '../api';
import { agentBindingsApi, AgentBinding } from '../api/agent-bindings';

interface Props {
  onNavigate?: (view: View) => void;
  authUser?: AuthUser | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  feishu: '飞书',
  telegram: 'Telegram',
  wechat: '微信',
};

const CHANNEL_ICONS: Record<string, string> = {
  feishu: 'chat',
  telegram: 'send',
  wechat: 'forum',
};

const BindXiaozhua: React.FC<Props> = ({ onNavigate, authUser }) => {
  const [bindings, setBindings] = useState<AgentBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bindCode, setBindCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadBindings = useCallback(async () => {
    try {
      setError('');
      const list = await agentBindingsApi.list();
      setBindings(list);
    } catch (e: any) {
      setError(await agentBindingsApi.getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBindings();
  }, [loadBindings]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await agentBindingsApi.generateCode();
      setBindCode(result);
    } catch (e: any) {
      setError(await agentBindingsApi.getErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    setError('');
    try {
      await agentBindingsApi.revoke(id);
      await loadBindings();
    } catch (e: any) {
      setError(await agentBindingsApi.getErrorMessage(e));
    } finally {
      setRevoking(null);
    }
  };

  const handleCopyCode = async () => {
    if (!bindCode?.code) return;
    try {
      await navigator.clipboard.writeText(bindCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      const el = document.getElementById('bind-code-display');
      if (el) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  };

  const formatExpiry = (dateStr: string) => {
    const d = new Date(dateStr);
    const mins = Math.max(0, Math.floor((d.getTime() - Date.now()) / 60000));
    if (mins <= 0) return '已过期';
    if (mins < 1) return '即将过期';
    return `${mins} 分钟后过期`;
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-bg-dark/80 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => onNavigate?.(View.Dashboard)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="material-icons-round text-white">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold">绑定小爪</h1>
            <p className="text-xs text-gray-400">连接 IM 助手，随时陪伴</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        {/* Info card */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="material-icons-round text-3xl text-primary">pets</span>
            <div>
              <h2 className="font-semibold text-lg mb-1">小爪 — 你的 AI 健身私教</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                在飞书、Telegram 或微信中添加小爪，随时随地记录饮食、查看训练、接收提醒。
                小爪会越来越懂你。
              </p>
            </div>
          </div>
        </div>

        {/* Bind code section */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">生成绑定码</h3>
          <p className="text-sm text-gray-400">
            点击下方按钮生成一次性绑定码，然后在 IM 中发送给小爪即可完成绑定。
            绑定码 <span className="text-primary font-semibold">10 分钟内有效</span>，用后即失效。
          </p>

          {bindCode ? (
            <div className="space-y-3">
              <div className="bg-bg-dark rounded-xl p-4 border border-primary/20 flex items-center justify-between">
                <div>
                  <span
                    id="bind-code-display"
                    className="text-3xl font-mono font-bold tracking-[0.3em] text-primary select-all"
                  >
                    {bindCode.code}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{formatExpiry(bindCode.expiresAt)}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span className="material-icons-round text-lg">{copied ? 'check' : 'content_copy'}</span>
                  <span className="text-sm">{copied ? '已复制' : '复制'}</span>
                </button>
              </div>
              <button
                onClick={() => { setBindCode(null); handleGenerate(); }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span className="material-icons-round text-sm align-middle mr-1">refresh</span>
                重新生成
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="material-icons-round animate-spin text-lg">sync</span>
                  生成中...
                </>
              ) : (
                <>
                  <span className="material-icons-round">vpn_key</span>
                  生成绑定码
                </>
              )}
            </button>
          )}
        </div>

        {/* Existing bindings */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold">已绑定的 IM 账号</h3>

          {loading ? (
            <div className="text-center py-6 text-gray-500">
              <span className="material-icons-round animate-spin text-2xl mb-2 block mx-auto">sync</span>
              加载中...
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={loadBindings}
                className="text-sm text-primary hover:underline"
              >
                点击重试
              </button>
            </div>
          ) : bindings.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-icons-round text-4xl text-gray-600 mb-2 block mx-auto">link_off</span>
              <p className="text-gray-500 text-sm">尚未绑定任何 IM 账号</p>
              <p className="text-gray-600 text-xs mt-1">生成绑定码后，在飞书/Telegram/微信发送给小爪即可</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bindings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 bg-bg-dark rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-icons-round text-primary">
                      {CHANNEL_ICONS[b.channel] ?? 'smart_toy'}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {CHANNEL_LABELS[b.channel] ?? b.channel}
                        {b.displayName && (
                          <span className="text-gray-500 ml-1">({b.displayName})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {b.status === 'active' ? (
                          <span className="text-green-400">● 已连接</span>
                        ) : (
                          <span className="text-red-400">● 已断开</span>
                        )}
                        {b.lastSeenAt && (
                          <span className="ml-2">
                            最近活跃: {new Date(b.lastSeenAt).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {b.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(b.id)}
                      disabled={revoking === b.id}
                      className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {revoking === b.id ? '解绑中...' : '解绑'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How to use */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">如何使用</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <div>
                <p className="text-sm font-medium">添加小爪为好友</p>
                <p className="text-xs text-gray-400">在飞书/Telegram/微信中搜索并添加小爪</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <div>
                <p className="text-sm font-medium">生成并发送绑定码</p>
                <p className="text-xs text-gray-400">在此页面生成绑定码，发送给小爪即可完成绑定</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <div>
                <p className="text-sm font-medium">开始使用</p>
                <p className="text-xs text-gray-400">在 IM 中让小爪查看今日状态、记录饮食、开始训练</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-24"></div>
      </div>
    </div>
  );
};

export default BindXiaozhua;
