import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { getTelegramInitData } from './utils/telegramClient';

console.log("main.tsx is executing!");

window.addEventListener('error', (event) => {
  console.error("Caught global error:", event.error);
  fetch('/api/logs/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': getTelegramInitData() },
    body: JSON.stringify({
      level: 'error',
      message: 'Global Error: ' + event.message,
      source: 'window.onerror',
      timestamp: new Date().toISOString(),
      stack: event.error?.stack,
      url: window.location.href
    })
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
