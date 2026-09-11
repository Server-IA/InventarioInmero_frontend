/**
 * @file main.jsx
 * @module main
 * @description Punto de entrada principal de la aplicación React. 
 * Renderiza el componente <App /> dentro de <Router> y <ThemeToggleProvider>.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { ThemeToggleProvider } from './components/dashboard/ThemeToggleProvider';

/**
 * Componente principal que monta la aplicación dentro del contexto de ThemeToggle y Router.
 * 
 * @function Main
 * @returns {JSX.Element} La aplicación envuelta en los proveedores necesarios.
 */
const Main = () => (
  <React.StrictMode>
    <ThemeToggleProvider>
      <Router basename="/inventario">
        <App />
      </Router>
    </ThemeToggleProvider>
  </React.StrictMode>
);

// Renderiza la aplicación React dentro del elemento con id 'root'
ReactDOM.createRoot(document.getElementById('root')).render(<Main />);
