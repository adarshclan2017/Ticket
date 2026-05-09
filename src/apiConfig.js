// In development, Vite proxy rewrites `/api` → `http://148.72.215.143:180`
// In production (after build), there is no proxy, so we hit the backend directly.

const isDev = import.meta.env.DEV;

export const API_BASE = isDev
  ? '/api'                           // uses Vite proxy
  : 'http://148.72.215.143:180';     // direct backend URL
