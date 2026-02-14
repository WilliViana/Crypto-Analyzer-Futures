import React, { ReactNode, ErrorInfo, Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './contexts/NotificationContext';
import { MarketDataProvider } from './hooks/useMarketData';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly define state as a class property
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  // Explicitly define props
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0B0E14',
          color: '#E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#EF4444', marginBottom: '10px', fontSize: '24px' }}>System Error</h2>
          <p style={{ marginBottom: '20px', color: '#9CA3AF' }}>The application encountered a critical error and cannot render.</p>
          <div style={{
            backgroundColor: '#151A25',
            padding: '20px',
            borderRadius: '8px',
            color: '#F87171',
            maxWidth: '800px',
            width: '100%',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #374151',
            textAlign: 'left',
            fontFamily: 'monospace',
            marginBottom: '20px'
          }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#EF4444' }}>
              {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown error'}
            </strong>
            {this.state.error?.stack}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global error handlers for non-React errors
window.addEventListener('error', (event) => {
    console.error("Global Error:", event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled Promise Rejection:", event.reason);
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <MarketDataProvider>
          <App />
        </MarketDataProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);