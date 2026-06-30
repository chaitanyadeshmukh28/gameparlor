import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Crest } from './lib.jsx';
import './index.css';

// Top-level error boundary: a single malformed field (e.g. an unexpected role/
// power key from a stale server) shows a friendly chamber notice instead of
// white-screening the whole app.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('The Council crashed:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="relative grid min-h-[100dvh] place-items-center p-6 text-center">
        <div className="panel max-w-sm space-y-3 p-6">
          <div className="flex justify-center"><Crest size={56} /></div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-brass-bright">The chamber stumbled</h1>
          <p className="text-sm text-parch/70">
            Something unexpected reached the table. Your seat is safe — reload to rejoin the Council.
          </p>
          <button className="btn-brass w-full" onClick={() => window.location.reload()}>Reload the chamber</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
