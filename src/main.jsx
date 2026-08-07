import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Initialize default Supabase credentials if not present or empty
const currentUrl = localStorage.getItem('supabase_url');
const currentKey = localStorage.getItem('supabase_key');
if (!currentUrl || !currentUrl.trim() || currentUrl.includes('mrpdkjhmzioyygictjua')) {
  localStorage.setItem('supabase_url', 'https://qxgwbihypspisenmwwih.supabase.co');
}
if (!currentKey || !currentKey.trim() || currentKey.includes('0kZjBWa7tBuHTCXIzEYKTA')) {
  localStorage.setItem('supabase_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4Z3diaWh5cHNwaXNlbm13d2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA0OTMyOCwiZXhwIjoyMTAxNjI1MzI4fQ.1iNouSCLvape4RtUUM0eEzBaWGj7RA_rgtqLH8XRsv4');
}

// Force service worker to check and activate updates immediately on all open tabs
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
