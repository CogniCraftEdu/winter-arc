import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Dashboard from './Dashboard.jsx';
import './styles.css';
import './dashboard.css';

// "/" is the public fitness page (the Instagram bio link). "/app" is the private tracker.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isApp = path === '/app' || window.location.hash === '#/app';

// The private tracker should never be indexed by search engines.
if (isApp) document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex,nofollow">');

createRoot(document.getElementById('root')).render(isApp ? <App /> : <Dashboard />);
