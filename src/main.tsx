import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GmailAuthProvider } from './context/GmailAuthContext.tsx';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <GmailAuthProvider>
        <App />
      </GmailAuthProvider>
    </StrictMode>,
  );
} catch (e) {
  console.error("React root render crash:", e);
  document.body.innerHTML = "<div style='padding:20px;color:red;font-family:sans-serif;'><h2>Runtime Render Crash</h2><pre>" + e.stack + "</pre></div>";
}
