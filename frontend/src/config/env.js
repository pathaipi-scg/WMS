// const DEFAULT_API_ORIGIN = 'http://127.0.0.1:3004';
const DEFAULT_API_ORIGIN = 'http://10.28.254.243:3004';
// python -m daphne -b 0.0.0.0 -p 3004 backend.asgi:application

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, '');
export const WS_ORIGIN = (import.meta.env.VITE_WS_ORIGIN || API_ORIGIN).replace(/\/$/, '');
