import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Show from './Show.jsx';
import './styles.css';
import './show.css';

// /show (or #/show) is the clean public dashboard; everything else is the tracker.
const isShow = /^\/show\/?$/.test(window.location.pathname) || window.location.hash === '#/show';

createRoot(document.getElementById('root')).render(isShow ? <Show /> : <App />);
