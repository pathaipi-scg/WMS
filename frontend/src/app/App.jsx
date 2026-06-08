import { useState } from 'react';
import { AppRouter } from './router';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  return <AppRouter activePage={activePage} onNavigate={setActivePage} />;
}
