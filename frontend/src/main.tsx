import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import App from './App';
import { LanguageProvider } from './lib/language';
import { queryClient } from './lib/query';
import './index.css';

document.documentElement.setAttribute('data-ui-booted', '1');

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('UI runtime crash:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 720, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Frontend runtime error</h1>
            <p style={{ marginTop: 8, color: '#475569' }}>
              Open browser DevTools Console to view full details, then share the first red error line.
            </p>
            <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 12, color: '#b91c1c' }}>
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppErrorBoundary>
          <App />
          <Toaster richColors position="top-right" />
        </AppErrorBoundary>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
