import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Initialize default Supabase credentials if not present
if (!localStorage.getItem('supabase_url')) {
  localStorage.setItem('supabase_url', 'https://mrpdkjhmzioyygictjua.supabase.co');
}
if (!localStorage.getItem('supabase_key')) {
  localStorage.setItem('supabase_key', 'sb_publishable_0kZjBWa7tBuHTCXIzEYKTA_3QusIMTf');
}

// Force service worker to check and activate updates immediately on all open tabs
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
