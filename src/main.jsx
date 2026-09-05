import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Initialize default Supabase credentials if not present or pointing to obsolete project
try {
  const currentUrl = localStorage.getItem('supabase_url');
  const currentKey = localStorage.getItem('supabase_key');
  if (!currentUrl || !currentUrl.trim() || currentUrl.includes('qxgwbihypspisenmwwih')) {
    localStorage.setItem('supabase_url', 'https://mrpdkjhmzioyygictjua.supabase.co');
  }
  if (!currentKey || !currentKey.trim() || currentKey.includes('qxgwbihypspisenmwwih')) {
    localStorage.setItem('supabase_key', 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf');
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
      localStorage.setItem('supabase_url', 'https://mrpdkjhmzioyygictjua.supabase.co');
      localStorage.setItem('supabase_key', 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf');
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

  handleFullReset = () => {
    try {
      localStorage.clear();
      localStorage.setItem('supabase_url', 'https://mrpdkjhmzioyygictjua.supabase.co');
      localStorage.setItem('supabase_key', 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf');
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
      const errMsg = this.state.error?.message || String(this.state.error || "Fallo en la carga");
      return (
        <div style={{ padding: "40px 20px", color: "#fff", backgroundColor: "#0f172a", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>⚠️ La aplicación se está actualizando</h2>
          <p style={{ opacity: 0.8, maxWidth: "480px", marginBottom: "16px", fontSize: "0.95rem" }}>
            Se han realizado cambios en la sincronización del servidor. Haz clic abajo para cargar la versión más reciente.
          </p>
          
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", padding: "12px 16px", borderRadius: "8px", fontSize: "0.85rem", maxWidth: "500px", marginBottom: "24px", wordBreak: "break-word" }}>
            <code>{errMsg}</code>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button 
              onClick={this.handleReset}
              style={{ padding: "12px 20px", borderRadius: "10px", backgroundColor: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "0.95rem" }}
            >
              🔄 Recargar Aplicación
            </button>
            <button 
              onClick={this.handleFullReset}
              style={{ padding: "12px 20px", borderRadius: "10px", backgroundColor: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "0.95rem" }}
            >
              🧹 Limpiar Caché y Restablecer
            </button>
          </div>
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
