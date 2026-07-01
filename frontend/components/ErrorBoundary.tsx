import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error) {
    console.error('App render error:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-white/10 rounded-2xl bg-[#121212] p-6 space-y-4">
          <h1 className="text-xl font-bold">页面出现异常</h1>
          <p className="text-sm text-gray-300 leading-6">
            为避免黑屏，应用已进入保护模式。请点击重试，若仍复现请反馈操作路径。
          </p>
          {this.state.message && (
            <pre className="text-xs text-red-300 bg-black/30 border border-red-500/20 rounded-lg p-3 overflow-x-auto">
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full bg-[#B8FF00] text-black font-bold py-3 rounded-xl hover:bg-[#a3e000] transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }
}
