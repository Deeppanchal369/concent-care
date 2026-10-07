import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import i18n from './i18n'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </I18nextProvider>
  </StrictMode>,
)
