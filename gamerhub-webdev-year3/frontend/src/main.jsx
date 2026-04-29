/**
 * main.jsx — Application entry point
 * Mounts the React app into the #root element in index.html.
 * Wraps everything in BrowserRouter (client-side routing)
 * and AuthProvider (global authentication state).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter enables client-side navigation with the History API */}
    <BrowserRouter>
      {/* AuthProvider makes the logged-in user available to every component */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
