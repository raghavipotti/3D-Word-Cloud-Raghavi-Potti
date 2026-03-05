import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Entrypoint for the React application.  This file renders the
// <App /> component into the root DOM element.  The StrictMode
// wrapper helps catch potential problems in development.

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);