import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ 
          background: '#f8f9fa', 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '20px'
        }}>
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px', color: '#f44336' }}>
              🚨 Something went wrong
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              The application encountered an unexpected error. This has been logged and will be fixed.
            </div>
            {this.state.error && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#666',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error Details:</div>
                <div>{this.state.error.toString()}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Reload Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                style={{
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 