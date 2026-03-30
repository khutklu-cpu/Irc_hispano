import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './components/App'

// Declarar funciones globales para el loading screen
declare global {
  interface Window {
    __hideLoading?: () => void;
    __showError?: (msg: string) => void;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
