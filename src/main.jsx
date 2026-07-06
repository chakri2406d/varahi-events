import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#131328',
              color: '#F1F0FF',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0D0D1A' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0D0D1A' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
