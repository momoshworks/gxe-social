import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA, Auto-Updates, and WhatsApp-style Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = (import.meta.env.BASE_URL || '/') + 'sw.js';
    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.log('⚡ PWA Service Worker registered successfully at:', swPath, registration.scope);
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
