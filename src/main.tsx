
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/instrument.css';
import './styles/neon.css';
import './styles/retro.css';
import './styles/matrix.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(<App />);
