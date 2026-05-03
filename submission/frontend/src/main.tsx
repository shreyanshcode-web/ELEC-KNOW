import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-mockclientid.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
);
