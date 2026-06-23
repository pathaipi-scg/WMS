import { AuthProvider } from '../features/auth';
import { AppRouter } from './router';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
