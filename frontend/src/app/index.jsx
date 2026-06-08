// Icon rule: use Lucide React for all icons; use @mui/icons-material only for icons Lucide lacks (currently: Forklift in SlotCard).
import { createRoot } from 'react-dom/client';

import App from './App';
import '../styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(<App />);
