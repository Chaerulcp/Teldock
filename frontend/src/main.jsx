import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import App from './App.jsx'
import { useAuthStore } from './store/auth-store.js'
import { useThemeStore } from './store/theme-store.js'
import { TransferProvider } from './store/transfer-context.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'

// App component with initialization effect wrapper
const AppWithInit = () => {
  const initialize = useAuthStore(state => state.initialize);
  const initTheme = useThemeStore(state => state.initTheme);
  
  useEffect(() => {
    initTheme();
    initialize();
  }, [initialize, initTheme]);
  
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TransferProvider>
        <AppWithInit />
      </TransferProvider>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  </React.StrictMode>,
)
