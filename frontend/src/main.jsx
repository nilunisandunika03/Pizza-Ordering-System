import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeCSRF } from './api/axios'

// Initialize CSRF token before rendering app
initializeCSRF().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch(error => {
  console.error('[CSRF] Failed to initialize, app may have limited functionality:', error);
  // Render app anyway - CSRF will retry on first request
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
});
