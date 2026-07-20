import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Initialize default Supabase credentials if not present or empty
const currentUrl = localStorage.getItem('supabase_url');
const currentKey = localStorage.getItem('supabase_key');
if (!currentUrl || !currentUrl.trim()) {
  localStorage.setItem('supabase_url', 'https://mrpdkjhmzioyygictjua.supabase.co');
}
if (!currentKey || !currentKey.trim()) {
  localStorage.setItem('supabase_key', 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf');
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
