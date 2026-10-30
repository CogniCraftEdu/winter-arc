import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Dashboard from './Dashboard.jsx';
import ReelMode from './ReelMode.jsx';
import { inject } from '@vercel/analytics';
import './styles.css';
import './dashboard.css';

// "/" is the public fitness page (the Instagram bio link). "/app" is the private tracker.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isApp = path === '/app' || window.location.hash === '#/app';

// The private tracker should never be indexed by search engines.
if (isApp) document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex,nofollow">');

// Visit counts for the public page only (needs Analytics switched on in the Vercel project; harmless otherwise).
if (!isApp && !new URLSearchParams(window.location.search).has('reel')) inject();

createRoot(document.getElementById('root')).render(isApp ? <App /> : new URLSearchParams(window.location.search).has('reel') ? <ReelMode /> : <Dashboard />);
