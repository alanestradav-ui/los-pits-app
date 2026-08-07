import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Initialize default Supabase credentials if not present or empty
try {
  const currentUrl = localStorage.getItem('supabase_url');
  const currentKey = localStorage.getItem('supabase_key');
  if (!currentUrl || !currentUrl.trim() || currentUrl.includes('mrpdkjhmzioyygictjua')) {
    localStorage.setItem('supabase_url', 'https://qxgwbihypspisenmwwih.supabase.co');
  }
  if (!currentKey || !currentKey.trim() || currentKey.includes('0kZjBWa7tBuHTCXIzEYKTA')) {
    localStorage.setItem('supabase_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3diaWh5cHNwaXNlbm13d2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA0OTMyOCwiZXhwIjoyMTAxNjI1MzI4fQ.1iNouSCLvape4RtUUM0eEzBaWGj7RA_rgtqLH8XRsv4');
  }
} catch (e) {
  console.warn("Storage init warning:", e);
}

try {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    }
  });
} catch (e) {
  console.warn("ServiceWorker init warning:", e);
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App Crash:", error, info);
  }
  handleReset = () => {
    try {
      localStorage.setItem('supabase_url', 'https://qxgwbihypspisenmwwih.supabase.co');
      localStorage.setItem('supabase_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3diaWh5cHNwaXNlbm13d2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA0OTMyOCwiZXhwIjoyMTAxNjI1MzI4fQ.1iNouSCLvape4RtUUM0eEzBaWGj7RA_rgtqLH8XRsv4');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          if (regs) { for (var i = 0; i < regs.length; i++) { regs[i].unregister(); } }
        }).catch(function(){});
      }
      if ('caches' in window) {
        caches.keys().then(function(names) {
          if (names) { for (var j = 0; j < names.length; j++) { caches.delete(names[j]); } }
        }).catch(function(){});
      }
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 20px", color: "#fff", backgroundColor: "#0f172a", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>⚠️ La aplicación se está actualizando</h2>
          <p style={{ opacity: 0.8, maxWidth: "480px", marginBottom: "24px", fontSize: "0.95rem" }}>
            Se han realizado cambios en la sincronización del servidor. Haz clic abajo para cargar la versión más reciente.
          </p>
          <button 
            onClick={this.handleReset}
            style={{ padding: "12px 24px", borderRadius: "10px", backgroundColor: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "1rem" }}
          >
            🔄 Cargar Versión Actualizada
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
