import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F3F5] flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-lg border border-red-100 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">Приложение перезагружается</h1>
            <p className="text-sm text-gray-500 mb-6">
              Обнаружена неполадка при отображении контента. Пожалуйста, попробуйте обновить страницу.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-red-50 text-red-600 p-3 rounded-2xl overflow-x-auto max-h-32 mb-6 font-mono">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              id="reload-app-error-boundary-btn"
              onClick={() => window.location.reload()}
              className="w-full bg-[#16B551] hover:scale-[1.02] active:scale-[0.98] text-white font-semibold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-brand-green-light/10"
            >
              Перезапустить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
