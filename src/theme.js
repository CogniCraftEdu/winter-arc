// Light / dark switch. No saved choice = follow the device. The choice is kept in this browser only.
const KEY = 'f2f:theme';
export const savedTheme = () => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch { return null; } };
export const currentTheme = () => savedTheme() || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export function applyTheme(v) { if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme'); }
export function setTheme(v) { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } applyTheme(v); }
applyTheme(savedTheme());
