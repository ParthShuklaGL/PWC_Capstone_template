import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No #root element â€” index.html and main.tsx disagree.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

